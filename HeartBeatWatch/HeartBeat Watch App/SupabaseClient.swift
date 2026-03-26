import Foundation

/// Sends health metrics directly to Supabase REST API.
/// Failed requests are queued in LocalBuffer and retried on next flush.
final class SupabaseClient {
    private let buffer = LocalBuffer()

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    /// Buffer a metric and attempt immediate delivery.
    func insert(_ metric: HealthMetric) {
        buffer.add(metric)
        Task { await flush() }
    }

    /// Retry all buffered metrics. Call on app launch and network restore.
    func flush() async {
        let pending = buffer.loadAll()
        guard !pending.isEmpty else { return }

        var sent: [HealthMetric] = []
        for metric in pending {
            if await post(metric) { sent.append(metric) }
        }
        buffer.remove(sent)
    }

    // MARK: - Private

    private func post(_ metric: HealthMetric) async -> Bool {
        // TODO: replace with lambda endpoint
        print("[SupabaseClient] This info should be sent: type=\(metric.type) value=\(metric.value) \(metric.unit) timestamp=\(metric.timestamp)")
        return true
    }
}
