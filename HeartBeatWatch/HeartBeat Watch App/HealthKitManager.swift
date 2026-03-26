import HealthKit
import Foundation

@MainActor
final class HealthKitManager: ObservableObject {
    let supabase = SupabaseClient()

    @Published var heartRate: Double = 0
    @Published var steps: Double = 0
    @Published var activeEnergy: Double = 0
    @Published var isAuthorized = false

    private let store = HKHealthStore()

    /// Stable device ID persisted in UserDefaults.
    private let deviceId: String = {
        let key = "hb_device_id"
        if let id = UserDefaults.standard.string(forKey: key) { return id }
        let id = UUID().uuidString
        UserDefaults.standard.set(id, forKey: key)
        return id
    }()

    private let readTypes: Set<HKObjectType> = [
        HKQuantityType(.heartRate),
        HKQuantityType(.stepCount),
        HKQuantityType(.activeEnergyBurned),
    ]

    private let writeTypes: Set<HKSampleType> = [
        HKQuantityType(.heartRate),
        HKQuantityType(.stepCount),
        HKQuantityType(.activeEnergyBurned),
    ]

    // MARK: - Auth

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        do {
            try await store.requestAuthorization(toShare: writeTypes, read: readTypes)
            isAuthorized = true
            startObserving()
        } catch {
            print("[HK] Auth failed: \(error)")
        }
    }

    // MARK: - Observer queries

    private func startObserving() {
        observe(.heartRate)
        observe(.stepCount)
        observe(.activeEnergyBurned)
    }

    private func observe(_ identifier: HKQuantityTypeIdentifier) {
        let type = HKQuantityType(identifier)

        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, handler, error in
            guard error == nil else { handler(); return }
            self?.fetchAndSend(identifier: identifier)
            handler()
        }
        store.execute(query)

        // Delivers updates even when the app is in the background.
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { success, error in
            if let error { print("[HK] Background delivery error for \(identifier.rawValue): \(error)") }
        }
    }

    // MARK: - Fetch

    private func fetchAndSend(identifier: HKQuantityTypeIdentifier) {
        switch identifier {
        case .heartRate:
            fetchLatest(
                type: HKQuantityType(.heartRate),
                unit: HKUnit.count().unitDivided(by: .minute()),
                metricType: .heartRate
            )
        case .stepCount:
            fetchTodaySum(type: HKQuantityType(.stepCount), unit: .count(), metricType: .steps)
        case .activeEnergyBurned:
            fetchTodaySum(type: HKQuantityType(.activeEnergyBurned), unit: .kilocalorie(), metricType: .activeEnergy)
        default:
            break
        }
    }

    private func fetchLatest(type: HKQuantityType, unit: HKUnit, metricType: MetricType) {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            guard let self, let sample = samples?.first as? HKQuantitySample else { return }
            let value = sample.quantity.doubleValue(for: unit)
            let metric = self.makeMetric(metricType, value: value, timestamp: sample.endDate)
            Task { @MainActor [weak self] in
                self?.heartRate = value
                self?.supabase.insert(metric)
            }
        }
        store.execute(query)
    }

    private func fetchTodaySum(type: HKQuantityType, unit: HKUnit, metricType: MetricType) {
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { [weak self] _, stats, _ in
            guard let self else { return }
            let value = stats?.sumQuantity()?.doubleValue(for: unit) ?? 0
            let metric = self.makeMetric(metricType, value: value, timestamp: .now)
            Task { @MainActor [weak self] in
                switch metricType {
                case .steps: self?.steps = value
                case .activeEnergy: self?.activeEnergy = value
                default: break
                }
                self?.supabase.insert(metric)
            }
        }
        store.execute(query)
    }

    // MARK: - Simulation (debug only)

#if DEBUG
    /// Simulates a reading: updates the UI immediately and sends to Supabase.
    /// Also writes into HealthKit so real observer pipelines are exercised on device.
    /// (HKObserverQuery doesn't reliably fire on the simulator for same-app writes.)
    func simulateSamples() {
        let now = Date()
        let bpm    = Double.random(in: 60...110)
        let steps  = Double.random(in: 200...1000)
        let kcal   = Double.random(in: 10...80)

        heartRate     = bpm
        self.steps    += steps
        activeEnergy  += kcal

        supabase.insert(makeMetric(.heartRate,    value: bpm,           timestamp: now))
        supabase.insert(makeMetric(.steps,        value: self.steps,    timestamp: now))
        supabase.insert(makeMetric(.activeEnergy, value: activeEnergy,  timestamp: now))

        writeToHealthKit(type: HKQuantityType(.heartRate),
                         quantity: HKQuantity(unit: .count().unitDivided(by: .minute()), doubleValue: bpm), date: now)
        writeToHealthKit(type: HKQuantityType(.stepCount),
                         quantity: HKQuantity(unit: .count(), doubleValue: steps), date: now)
        writeToHealthKit(type: HKQuantityType(.activeEnergyBurned),
                         quantity: HKQuantity(unit: .kilocalorie(), doubleValue: kcal), date: now)
    }

    private func writeToHealthKit(type: HKQuantityType, quantity: HKQuantity, date: Date) {
        let sample = HKQuantitySample(type: type, quantity: quantity, start: date, end: date)
        store.save(sample) { _, error in
            if let error { print("[HK] Simulate write error: \(error)") }
        }
    }
#endif

    private func makeMetric(_ type: MetricType, value: Double, timestamp: Date) -> HealthMetric {
        HealthMetric(
            id: UUID().uuidString,
            type: type.rawValue,
            value: value,
            unit: type.unit,
            timestamp: timestamp,
            deviceId: deviceId
        )
    }
}
