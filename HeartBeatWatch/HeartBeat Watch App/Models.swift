import Foundation

struct HealthMetric: Codable, Identifiable {
    let id: String
    let type: String
    let value: Double
    let unit: String
    let timestamp: Date
    let deviceId: String

    enum CodingKeys: String, CodingKey {
        case id, type, value, unit, timestamp
        case deviceId = "device_id"
    }
}

enum MetricType: String {
    case heartRate = "heart_rate"
    case steps = "steps"
    case activeEnergy = "active_energy"

    var unit: String {
        switch self {
        case .heartRate: return "bpm"
        case .steps: return "count"
        case .activeEnergy: return "kcal"
        }
    }
}
