import SwiftUI

struct ContentView: View {
    @EnvironmentObject var hk: HealthKitManager

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                MetricCard(
                    label: "Heart Rate",
                    value: hk.heartRate > 0 ? "\(Int(hk.heartRate))" : "—",
                    unit: "BPM",
                    color: .red
                )
                MetricCard(
                    label: "Steps",
                    value: hk.steps > 0 ? "\(Int(hk.steps))" : "—",
                    unit: "today",
                    color: .green
                )
                MetricCard(
                    label: "Active Energy",
                    value: hk.activeEnergy > 0 ? "\(Int(hk.activeEnergy))" : "—",
                    unit: "kcal",
                    color: .orange
                )
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("HeartBeat")
        .task {
            await hk.requestAuthorization()
            await hk.supabase.flush()
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
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(value)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundStyle(color)
                    Text(unit)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
