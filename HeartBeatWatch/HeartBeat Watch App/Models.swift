import Foundation
import SwiftUI

// MARK: - Stress level

/// Derived from HRV + HR relative to resting baseline.
/// LQTS Type 1 & 2 are triggered by sympathetic surges — high stress = high risk.
enum StressLevel {
    case calm
    case moderate
    case high

    var label: String {
        switch self {
        case .calm:     return "Calm"
        case .moderate: return "Moderate"
        case .high:     return "High"
        }
    }

    var color: Color {
        switch self {
        case .calm:     return .green
        case .moderate: return .yellow
        case .high:     return .red
        }
    }

    static func compute(hr: Double, hrv: Double, restingHR: Double) -> StressLevel {
        // HRV is the primary indicator — autonomic balance
        if hrv > 0 && hrv < 10 { return .high }
        if hrv > 0 && hrv < 20 { return .moderate }
        // Secondary: HR significantly above resting baseline → sympathetic activation
        if restingHR > 0 && hr > restingHR * 1.35 { return .moderate }
        return .calm
    }
}

// MARK: - Long QT risk model

/// ⚠️ Not a medical diagnosis — for monitoring and awareness only.
enum LongQTRisk {
    case normal
    case caution
    case elevated

    var label: String {
        switch self {
        case .normal:   return "Normal"
        case .caution:  return "Caution"
        case .elevated: return "Elevated"
        }
    }

    var color: Color {
        switch self {
        case .normal:   return .green
        case .caution:  return .yellow
        case .elevated: return .red
        }
    }

    var systemImage: String {
        switch self {
        case .normal:   return "heart.fill"
        case .caution:  return "heart.fill"
        case .elevated: return "exclamationmark.heart.fill"
        }
    }

    static func compute(
        hr: Double,
        hrv: Double,
        irregularRhythm: Bool,
        isAsleep: Bool,
        stress: StressLevel
    ) -> LongQTRisk {
        var score = 0

        // Bradycardia — tighter threshold during sleep (LQTS Type 3: slow HR unmasks QT prolongation)
        let bradycardiaThreshold: Double = isAsleep ? 45 : 50
        if hr > 0 && hr < bradycardiaThreshold { score += 2 }

        // Tachycardia — can trigger LQTS Type 1 & 2
        if hr > 130 { score += 1 }

        // Low HRV — autonomic dysfunction
        if hrv > 0 && hrv < 20 { score += 1 }
        if hrv > 0 && hrv < 10 { score += 1 }

        // Irregular rhythm — always flag
        if irregularRhythm { score += 2 }

        // High stress during sleep = sympathetic surge in REM — most dangerous trigger
        if stress == .high { score += 1 }
        if stress == .high && isAsleep { score += 1 }

        switch score {
        case 0:  return .normal
        case 1:  return .caution
        default: return .elevated
        }
    }
}
