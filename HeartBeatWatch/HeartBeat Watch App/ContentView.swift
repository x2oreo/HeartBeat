import SwiftUI

struct ContentView: View {
    @EnvironmentObject var hk: HealthKitManager

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                RiskBanner(risk: hk.riskLevel, irregularRhythm: hk.irregularRhythmDetected)

                HeartRateCard(bpm: hk.heartRate, rrMs: hk.rrIntervalMs)

                HStack(spacing: 8) {
                    MetricCard(label: "HRV (SDNN)", value: hk.hrv > 0 ? "\(Int(hk.hrv))" : "—",
                               unit: "ms", color: hrvColor(hk.hrv))
                    StatusBadge(label: hk.isAsleep ? "Sleeping" : "Awake",
                                icon: hk.isAsleep ? "moon.fill" : "sun.min.fill",
                                color: hk.isAsleep ? .indigo : .yellow)
                }

                HStack(spacing: 8) {
                    MetricCard(label: "Stress", value: hk.stressLevel.label,
                               unit: "", color: hk.stressLevel.color)
                    if hk.isAsleep {
                        StatusBadge(label: "Sleep risk", icon: "exclamationmark.moon.fill", color: .orange)
                    }
                }

                if hk.restingHR > 0 {
                    MetricCard(label: "Resting HR", value: "\(Int(hk.restingHR))",
                               unit: "bpm", color: .secondary)
                }

                MetricCard(label: "Steps",  value: hk.steps > 0 ? "\(Int(hk.steps))" : "—",
                           unit: "today", color: .green)
                MetricCard(label: "Calories", value: hk.activeEnergy > 0 ? "\(Int(hk.activeEnergy))" : "—",
                           unit: "kcal", color: .orange)

                Text("⚠️ Not a medical device")
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
                    .padding(.top, 4)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("HeartBeat")
        .task {
            await hk.requestAuthorization()
        }
#if DEBUG
        .toolbar {
            ToolbarItem(placement: .bottomBar) {
                Button("Simulate") { hk.simulateSamples() }
                    .font(.caption)
                    .foregroundStyle(.blue)
            }
        }
#endif
    }

    private func hrvColor(_ sdnn: Double) -> Color {
        guard sdnn > 0 else { return .secondary }
        if sdnn < 10 { return .red }
        if sdnn < 20 { return .yellow }
        return .green
    }
}

// MARK: - Subviews

struct RiskBanner: View {
    let risk: LongQTRisk
    let irregularRhythm: Bool

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: risk.systemImage)
                .font(.system(size: 13, weight: .semibold))
            VStack(alignment: .leading, spacing: 1) {
                Text("Long QT Risk: \(risk.label)")
                    .font(.system(size: 11, weight: .semibold))
                if irregularRhythm {
                    Text("Irregular rhythm detected")
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .foregroundStyle(risk.color)
        .padding(10)
        .background(risk.color.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct HeartRateCard: View {
    let bpm: Double
    let rrMs: Double

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Heart Rate")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(bpm > 0 ? "\(Int(bpm))" : "—")
                        .font(.title3).fontWeight(.semibold)
                        .foregroundStyle(hrColor(bpm))
                    Text("bpm")
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if rrMs > 0 {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("RR interval")
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                    Text("\(Int(rrMs)) ms")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func hrColor(_ bpm: Double) -> Color {
        guard bpm > 0 else { return .secondary }
        if bpm < 50 { return .red }
        if bpm > 130 { return .orange }
        return .red
    }
}

struct StatusBadge: View {
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct MetricCard: View {
    let label: String
    let value: String
    let unit: String
    let color: Color

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption2).foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(value)
                        .font(.title3).fontWeight(.semibold)
                        .foregroundStyle(color)
                    Text(unit)
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
