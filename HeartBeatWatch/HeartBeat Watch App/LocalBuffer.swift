import Foundation

/// Thread-safe offline buffer — stores metrics in UserDefaults when network is unavailable.
final class LocalBuffer {
    private let key = "hb_pending_metrics"
    private let lock = NSLock()

    private static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()

    func add(_ metric: HealthMetric) {
        lock.withLock {
            var pending = load()
            pending.append(metric)
            save(pending)
        }
    }

    func loadAll() -> [HealthMetric] {
        lock.withLock { load() }
    }

    func remove(_ metrics: [HealthMetric]) {
        guard !metrics.isEmpty else { return }
        let ids = Set(metrics.map(\.id))
        lock.withLock {
            var pending = load()
            pending.removeAll { ids.contains($0.id) }
            save(pending)
        }
    }

    // MARK: - Private

    private func load() -> [HealthMetric] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let items = try? Self.decoder.decode([HealthMetric].self, from: data)
        else { return [] }
        return items
    }

    private func save(_ metrics: [HealthMetric]) {
        if let data = try? Self.encoder.encode(metrics) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}
