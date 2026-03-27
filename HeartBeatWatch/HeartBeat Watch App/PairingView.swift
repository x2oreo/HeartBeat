import SwiftUI

/// Shows a 6-digit code the user enters on the HeartGuard web app (Settings → Apple Watch).
/// Polls the server every 3 seconds until the code is claimed and a token is returned.
struct PairingView: View {
    @EnvironmentObject var apiClient: WatchAPIClient

    @State private var code: String = Self.randomCode()
    @State private var serverURL = "https://qtshield.me"
    @State private var pairingState: PairingState = .registering
    @State private var showServerURL = false
    @State private var pollTask: Task<Void, Never>?
    @State private var secondsLeft = 300

    enum PairingState {
        case registering
        case waiting
        case error(String)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "applewatch.and.arrow.forward")
                    .font(.system(size: 28))
                    .foregroundStyle(.blue)

                Text("Pair with HeartGuard")
                    .font(.headline)

                switch pairingState {
                case .registering:
                    ProgressView("Connecting…")
                        .font(.caption)

                case .waiting:
                    VStack(spacing: 6) {
                        Text("Enter this code at")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text(serverURL)
                            .font(.caption2)
                            .foregroundStyle(.blue)

                        Text("Settings → Apple Watch")
                            .font(.caption2)
                            .foregroundStyle(.secondary)

                        Text(code)
                            .font(.system(size: 22, weight: .bold, design: .monospaced))
                            .tracking(4)
                            .padding(.vertical, 4)

                        Text("Expires in \(secondsLeft / 60):\(String(format: "%02d", secondsLeft % 60))")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }

                case .error(let msg):
                    VStack(spacing: 8) {
                        Text(msg)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)

                        Button("Try Again") {
                            code = Self.randomCode()
                            start()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }

                if showServerURL {
                    TextField("Server URL", text: $serverURL)
                        .font(.caption2)
                        .textContentType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .onChange(of: serverURL) { _, _ in
                            pollTask?.cancel()
                            start()
                        }
                }

                Button {
                    showServerURL.toggle()
                } label: {
                    Text(showServerURL ? "Hide server URL" : "Custom server")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Setup")
        .onAppear { start() }
        .onDisappear { pollTask?.cancel() }
    }

    // MARK: - Logic

    private func start() {
        pollTask?.cancel()
        pairingState = .registering
        secondsLeft = 300
        pollTask = Task { await registerAndPoll() }
    }

    private func log(_ msg: String) {
        let line = "[PAIR] \(msg)"
        print(line)
        guard let url = URL(string: "http://10.1.85.215:4567/log") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.httpBody = (line + "\n").data(using: .utf8)
        req.timeoutInterval = 1
        URLSession.shared.dataTask(with: req).resume()
    }

    private func registerAndPoll() async {
        let url = serverURL
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        log("Starting pairing — code=\(code) server=\(url)")
        await MainActor.run { pairingState = .waiting }

        // Poll every 3 seconds
        guard let pollURL = URL(string: "\(url)/api/watch/pair/poll?code=\(code)") else { return }

        while !Task.isCancelled && secondsLeft > 0 {
            try? await Task.sleep(for: .seconds(3))
            await MainActor.run { secondsLeft = max(0, secondsLeft - 3) }

            guard !Task.isCancelled else { return }

            do {
                let (data, pollResponse) = try await URLSession.shared.data(from: pollURL)
                let pollStatus = (pollResponse as? HTTPURLResponse)?.statusCode ?? 0
                let body = String(data: data, encoding: .utf8) ?? ""
                log("GET /poll → HTTP \(pollStatus) body=\(body)")
                struct PollResponse: Decodable { let status: String; let token: String? }
                let result = try JSONDecoder().decode(PollResponse.self, from: data)

                switch result.status {
                case "claimed":
                    guard let token = result.token else {
                        log("claimed but token missing")
                        continue
                    }
                    let saved = KeychainHelper.saveToken(token)
                    if saved { _ = KeychainHelper.saveServerURL(url) }
                    log("Paired! keychain saved=\(saved)")
                    await MainActor.run {
                        apiClient.isPaired = saved
                        apiClient.isConnected = saved
                    }
                    return
                case "expired":
                    log("Code expired on server")
                    await MainActor.run { pairingState = .error("Code expired. Tap Try Again.") }
                    return
                default:
                    break // "waiting" — keep polling
                }
            } catch {
                log("Poll error: \(error)")
            }
        }

        if secondsLeft <= 0 {
            await MainActor.run { pairingState = .error("Code expired. Tap Try Again.") }
        }
    }

    private static func randomCode() -> String {
        String(format: "%06d", Int.random(in: 0...999999))
    }
}
