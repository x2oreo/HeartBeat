import Foundation
import WatchKit

/// HTTP client for communicating with the QTShield Next.js API.
/// All requests are authenticated with a bearer token stored in Keychain.
@MainActor
final class WatchAPIClient: ObservableObject {

    static let shared = WatchAPIClient()

    @Published var isConnected = false
    @Published var isPaired = false

    private let session: URLSession
    private var lastHealthDataSent: Date = .distantPast
    private let healthDataInterval: TimeInterval = 600 // Minimum seconds between health data pushes
    private let remoteLogURL = URL(string: "http://10.1.85.215:4567/log")!

    private func remoteLog(_ msg: String) {
        let line = "[API] \(msg)"
        print(line)
        var req = URLRequest(url: remoteLogURL)
        req.httpMethod = "POST"
        req.httpBody = (line + "\n").data(using: .utf8)
        req.timeoutInterval = 1
        URLSession.shared.dataTask(with: req).resume()
    }

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)
        self.isPaired = KeychainHelper.hasToken
    }

    // MARK: - Server URL

    var serverBaseURL: String {
        KeychainHelper.loadServerURL() ?? "http://10.1.85.215:3000"
    }

    // MARK: - Pairing

    /// Exchange a 6-digit pairing code for an API bearer token.
    func exchangePairingCode(_ code: String, serverURL: String) async throws -> Bool {
        let url = URL(string: "\(serverURL)/api/watch/auth/token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["code": code])

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            return false
        }

        struct TokenResponse: Decodable { let token: String }
        let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)

        let saved = KeychainHelper.saveToken(tokenResponse.token)
        if saved {
            _ = KeychainHelper.saveServerURL(serverURL)
            isPaired = true
            isConnected = true
        }
        return saved
    }

    /// Notify server then remove stored credentials.
    func unpair() async {
        do {
            try await post(path: "/api/watch/unpair", body: [:])
        } catch {
            remoteLog("Unpair server call failed (continuing anyway): \(error)")
        }
        KeychainHelper.deleteToken()
        KeychainHelper.deleteServerURL()
        isPaired = false
        isConnected = false
    }

    // MARK: - Health Data

    /// Send health data to the server, throttled to `healthDataInterval`.
    func sendHealthDataIfNeeded(
        heartRate: Double,
        hrv: Double,
        restingHR: Double,
        rrIntervalMs: Double,
        steps: Double,
        activeEnergy: Double,
        riskLevel: LongQTRisk,
        stressLevel: StressLevel,
        isAsleep: Bool,
        irregularRhythm: Bool
    ) async {
        let now = Date()
        guard now.timeIntervalSince(lastHealthDataSent) >= healthDataInterval else { return }
        guard isPaired else { return }

        lastHealthDataSent = now

        let payload: [String: Any] = [
            "heartRate": heartRate,
            "hrv": hrv,
            "restingHR": restingHR,
            "rrIntervalMs": rrIntervalMs,
            "steps": steps,
            "activeEnergy": activeEnergy,
            "riskLevel": riskLevel.apiValue,
            "stressLevel": stressLevel.apiValue,
            "isAsleep": isAsleep,
            "irregularRhythm": irregularRhythm,
            "recordedAt": ISO8601DateFormatter().string(from: now),
        ]

        do {
            try await post(path: "/api/watch/health-data", body: payload)
            isConnected = true
        } catch {
            print("[API] Health data send failed: \(error)")
            isConnected = false
        }
    }

    // MARK: - Alerts

    /// Send a risk alert immediately (no throttle).
    func sendAlert(
        riskLevel: LongQTRisk,
        heartRate: Double,
        hrv: Double,
        stressLevel: StressLevel,
        isAsleep: Bool,
        irregularRhythm: Bool
    ) async {
        guard isPaired else { return }

        let payload: [String: Any] = [
            "riskLevel": riskLevel.apiValue,
            "heartRate": heartRate,
            "hrv": hrv,
            "stressLevel": stressLevel.apiValue,
            "isAsleep": isAsleep,
            "irregularRhythm": irregularRhythm,
            "message": buildAlertMessage(riskLevel: riskLevel, heartRate: heartRate, hrv: hrv, isAsleep: isAsleep, irregularRhythm: irregularRhythm),
            "triggeredAt": ISO8601DateFormatter().string(from: .now),
        ]

        remoteLog("Sending alert — risk:\(riskLevel.apiValue) hr:\(Int(heartRate)) hrv:\(Int(hrv))")
        do {
            try await post(path: "/api/watch/alert", body: payload)
            isConnected = true
            remoteLog("Alert sent OK")
        } catch {
            remoteLog("Alert send FAILED: \(error)")
            isConnected = false
        }
    }

    // MARK: - Device Registration

    /// Register the APNS device token for push notifications.
    func registerDevice(apnsToken: Data) async {
        guard isPaired else { return }
        let tokenString = apnsToken.map { String(format: "%02x", $0) }.joined()
        let payload: [String: Any] = ["apnsToken": tokenString]
        do {
            try await post(path: "/api/watch/register-device", body: payload)
        } catch {
            print("[API] Device registration failed: \(error)")
        }
    }

    // MARK: - Config

    /// Fetch watch configuration (monitoring mode, medications, genotype).
    func fetchConfig() async -> WatchConfig? {
        guard isPaired else { return nil }
        do {
            let data = try await get(path: "/api/watch/config")
            return try JSONDecoder().decode(WatchConfig.self, from: data)
        } catch {
            print("[API] Config fetch failed: \(error)")
            return nil
        }
    }

    // MARK: - HTTP Helpers

    private func post(path: String, body: [String: Any]) async throws {
        let url = URL(string: "\(serverBaseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        addAuth(to: &request)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
    }

    private func get(path: String) async throws -> Data {
        let url = URL(string: "\(serverBaseURL)\(path)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        addAuth(to: &request)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        return data
    }

    private func addAuth(to request: inout URLRequest) {
        if let token = KeychainHelper.loadToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func buildAlertMessage(
        riskLevel: LongQTRisk,
        heartRate: Double,
        hrv: Double,
        isAsleep: Bool,
        irregularRhythm: Bool
    ) -> String {
        var parts: [String] = []
        switch riskLevel {
        case .elevated: parts.append("Multiple risk factors detected.")
        case .caution:  parts.append("Monitor your condition closely.")
        case .normal:   break
        }
        if heartRate > 0  { parts.append("HR: \(Int(heartRate)) bpm") }
        if hrv > 0        { parts.append("HRV: \(Int(hrv)) ms") }
        if isAsleep       { parts.append("Detected during sleep.") }
        if irregularRhythm { parts.append("Irregular rhythm detected.") }
        return parts.joined(separator: " ")
    }
}

// MARK: - Supporting types

enum APIError: Error {
    case invalidResponse
    case httpError(Int)
}

struct WatchConfig: Decodable {
    let monitoringMode: String
    let medications: [WatchMedication]
    let genotype: String?
}

struct WatchMedication: Decodable {
    let genericName: String
    let riskCategory: String
}

// MARK: - API value extensions

extension LongQTRisk {
    var apiValue: String {
        switch self {
        case .normal:   return "NORMAL"
        case .caution:  return "CAUTION"
        case .elevated: return "ELEVATED"
        }
    }
}

extension StressLevel {
    var apiValue: String {
        switch self {
        case .calm:     return "CALM"
        case .moderate: return "MODERATE"
        case .high:     return "HIGH"
        }
    }
}
