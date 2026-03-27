import Foundation
import SwiftUI

// MARK: - LQTS Genotype

/// The three main Long QT Syndrome genotypes, each with distinct triggers.
/// - LQT1 (IKs): exercise, swimming, adrenergic stimulation
/// - LQT2 (IKr/hERG): emotional stress, auditory startle, sleep arousal
/// - LQT3 (SCN5A): rest, sleep, bradycardia
enum LQTSGenotype: String, Codable {
    case lqt1 = "LQT1"
    case lqt2 = "LQT2"
    case lqt3 = "LQT3"
    case other = "OTHER"
    case unknown = "UNKNOWN"

    var triggerDescription: String {
        switch self {
        case .lqt1:    return "Exercise & swimming"
        case .lqt2:    return "Stress & auditory stimuli"
        case .lqt3:    return "Sleep & rest"
        case .other:   return "Varies"
        case .unknown: return "Not determined"
        }
    }
}

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
///
/// Genotype-aware risk scoring:
/// - LQT1: Emphasizes exercise HR, tachycardia, poor HR recovery
/// - LQT2: Emphasizes emotional stress, sudden HR spikes, sleep arousal
/// - LQT3: Emphasizes bradycardia during sleep, low resting HR, rest periods
/// - Unknown/Other: Conservative scoring — flags all genotype-specific triggers
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

    /// Compute risk score with genotype-specific weighting.
    ///
    /// Clinical basis:
    /// - LQT1 (IKs channel): 62% of events during exercise, 3% during sleep.
    ///   Exercise causes QT failure to shorten → risk scales with activity intensity.
    /// - LQT2 (IKr/hERG channel): 43% with emotional stress, 29% during sleep/rest.
    ///   Auditory startle and arousal from sleep trigger QT prolongation.
    /// - LQT3 (SCN5A sodium channel): 39% during sleep/rest, 13% during exercise.
    ///   Bradycardia unmasks late sodium current → QT prolongation at slow rates.
    static func compute(
        hr: Double,
        hrv: Double,
        irregularRhythm: Bool,
        isAsleep: Bool,
        stress: StressLevel,
        genotype: LQTSGenotype = .unknown,
        oxygenSaturation: Double = 0,
        respiratoryRate: Double = 0,
        hrRecovery: Double? = nil,
        recentDrugRisk: Bool = false
    ) -> LongQTRisk {
        var score = 0

        // ── Universal risk factors (all genotypes) ────────────────────

        // Irregular rhythm — always dangerous, regardless of genotype
        if irregularRhythm { score += 3 }

        // Very low HRV — autonomic dysfunction
        if hrv > 0 && hrv < 10 { score += 2 }
        else if hrv > 0 && hrv < 20 { score += 1 }

        // Low oxygen saturation — hypoxia triggers arrhythmias
        if oxygenSaturation > 0 && oxygenSaturation < 94 { score += 1 }
        if oxygenSaturation > 0 && oxygenSaturation < 90 { score += 2 }

        // High respiratory rate + low HRV = autonomic crisis
        if respiratoryRate > 20 && hrv > 0 && hrv < 15 { score += 1 }

        // Recently scanned a QT-prolonging drug → heightened monitoring window
        if recentDrugRisk { score += 1 }

        // ── Genotype-specific scoring ─────────────────────────────────

        switch genotype {
        case .lqt1:
            // LQT1: Exercise and adrenergic stimulation are primary triggers
            // Tachycardia during exercise is the danger sign
            if hr > 120 { score += 2 }  // Lower threshold than general (120 vs 130)
            if hr > 150 { score += 1 }  // Very high exercise HR = critical

            // Poor heart rate recovery post-exercise (< 12 bpm drop in 1 min)
            if let recovery = hrRecovery, recovery < 12 { score += 2 }

            // High stress during activity compounds risk
            if stress == .high { score += 1 }

            // Sleep is relatively safe for LQT1 (only 3% of events)
            // Don't penalize bradycardia during sleep as heavily

        case .lqt2:
            // LQT2: Emotional stress and auditory startle are triggers
            // Sudden HR spikes (not sustained tachycardia) are concerning
            if stress == .high { score += 2 }  // Extra weight on stress
            if stress == .high && isAsleep { score += 2 }  // Arousal from sleep = max danger

            // Tachycardia still relevant
            if hr > 130 { score += 1 }

            // Bradycardia during rest — LQT2 events happen during rest (29%)
            let bradycardiaThreshold: Double = isAsleep ? 48 : 50
            if hr > 0 && hr < bradycardiaThreshold { score += 1 }

        case .lqt3:
            // LQT3: Bradycardia and sleep are primary triggers
            // Slow HR unmasks late sodium current → QT prolongation
            let bradycardiaThreshold: Double = isAsleep ? 45 : 50
            if hr > 0 && hr < bradycardiaThreshold { score += 3 }  // Extra weight

            // Sleep itself is a risk factor
            if isAsleep { score += 1 }

            // High stress during sleep (REM arousal)
            if stress == .high && isAsleep { score += 1 }

            // Exercise is relatively safe for LQT3 (13% of events)
            // Tachycardia is less concerning

        case .other, .unknown:
            // Conservative: apply all genotype triggers with moderate weights
            let bradycardiaThreshold: Double = isAsleep ? 45 : 50
            if hr > 0 && hr < bradycardiaThreshold { score += 2 }
            if hr > 130 { score += 1 }
            if stress == .high { score += 1 }
            if stress == .high && isAsleep { score += 1 }
        }

        // ── Risk level mapping ────────────────────────────────────────
        switch score {
        case 0:     return .normal
        case 1...2: return .caution
        default:    return .elevated
        }
    }
}
