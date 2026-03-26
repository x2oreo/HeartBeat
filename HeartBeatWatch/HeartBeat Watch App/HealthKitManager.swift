import HealthKit
import Foundation
import WatchKit
import UserNotifications

@MainActor
final class HealthKitManager: NSObject, ObservableObject {

    // MARK: - Published state

    @Published var heartRate: Double = 0
    @Published var rrIntervalMs: Double = 0
    @Published var hrv: Double = 0
    @Published var restingHR: Double = 0
    @Published var steps: Double = 0
    @Published var activeEnergy: Double = 0
    @Published var irregularRhythmDetected = false
    @Published var isAsleep = false
    @Published var stressLevel: StressLevel = .calm
    @Published var riskLevel: LongQTRisk = .normal
    @Published var isAuthorized = false

    private let store = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?

    // MARK: - HealthKit types

    private var readTypes: Set<HKObjectType> {
        [
            HKQuantityType(.heartRate),
            HKQuantityType(.stepCount),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.heartRateVariabilitySDNN),
            HKQuantityType(.restingHeartRate),
            HKCategoryType(.irregularHeartRhythmEvent),
            HKCategoryType(.sleepAnalysis),
        ]
    }

    // Write access only needed for debug simulation
    private let writeTypes: Set<HKSampleType> = [
        HKQuantityType(.heartRate),
        HKQuantityType(.heartRateVariabilitySDNN),
    ]

    // MARK: - Auth

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        do {
            try await store.requestAuthorization(toShare: writeTypes, read: readTypes)
            isAuthorized = true
            await requestNotificationPermission()
            startWorkoutSession()
            startObservers()
        } catch {
            print("[HK] Auth failed: \(error)")
        }
    }

    // MARK: - Workout session (keeps HR sensor always on in background)

    private func startWorkoutSession() {
        let config = HKWorkoutConfiguration()
        config.activityType = .other
        config.locationType = .unknown
        do {
            let session = try HKWorkoutSession(healthStore: store, configuration: config)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
            session.delegate = self
            builder.delegate = self
            workoutSession = session
            workoutBuilder = builder
            session.startActivity(with: .now)
            builder.beginCollection(withStart: .now) { _, error in
                if let error { print("[HK] Workout collection error: \(error)") }
            }
            print("[HK] Workout session started — HR sensor always on")
        } catch {
            print("[HK] Workout session unavailable: \(error) — falling back to observer queries")
        }
    }

    // MARK: - Observer queries (HRV, sleep, irregular rhythm — not covered by workout builder)

    private func startObservers() {
        observeQuantity(.stepCount)
        observeQuantity(.heartRateVariabilitySDNN)
        observeQuantity(.restingHeartRate)
        observeIrregularRhythm()
        observeSleep()
    }

    private func observeQuantity(_ identifier: HKQuantityTypeIdentifier) {
        let type = HKQuantityType(identifier)
        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, handler, error in
            guard error == nil else { handler(); return }
            Task { [weak self] in await self?.fetchQuantity(identifier) }
            handler()
        }
        store.execute(query)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func fetchQuantity(_ identifier: HKQuantityTypeIdentifier) {
        switch identifier {
        case .stepCount:
            fetchTodaySum(type: HKQuantityType(.stepCount), unit: .count()) { [weak self] value in
                self?.steps = value
            }
        case .heartRateVariabilitySDNN:
            fetchLatest(type: HKQuantityType(.heartRateVariabilitySDNN), unit: .secondUnit(with: .milli)) { [weak self] value in
                self?.hrv = value
                self?.updateRisk()
            }
        case .restingHeartRate:
            fetchLatest(type: HKQuantityType(.restingHeartRate), unit: .count().unitDivided(by: .minute())) { [weak self] value in
                self?.restingHR = value
            }
        default:
            break
        }
    }

    private func observeIrregularRhythm() {
        let type = HKCategoryType(.irregularHeartRhythmEvent)
        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, handler, error in
            guard error == nil else { handler(); return }
            Task { [weak self] in await self?.checkIrregularRhythm() }
            handler()
        }
        store.execute(query)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func observeSleep() {
        let type = HKCategoryType(.sleepAnalysis)
        let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, handler, error in
            guard error == nil else { handler(); return }
            Task { [weak self] in await self?.checkSleepState() }
            handler()
        }
        store.execute(query)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func checkIrregularRhythm() {
        let type = HKCategoryType(.irregularHeartRhythmEvent)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            let detected = samples?.first.map { Date().timeIntervalSince($0.endDate) < 86400 } ?? false
            Task { @MainActor [weak self] in
                self?.irregularRhythmDetected = detected
                self?.updateRisk()
            }
        }
        store.execute(query)
    }

    private func checkSleepState() {
        let type = HKCategoryType(.sleepAnalysis)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
            guard let sample = samples?.first as? HKCategorySample else { return }
            let recentEnough = Date().timeIntervalSince(sample.endDate) < 900
            let sleeping = sample.value != HKCategoryValueSleepAnalysis.awake.rawValue
            Task { @MainActor [weak self] in
                self?.isAsleep = recentEnough && sleeping
                self?.updateRisk()
            }
        }
        store.execute(query)
    }

    // MARK: - Fetch helpers

    private func fetchLatest(type: HKQuantityType, unit: HKUnit, then: @escaping @MainActor (Double) -> Void) {
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else { return }
            let value = sample.quantity.doubleValue(for: unit)
            Task { @MainActor in then(value) }
        }
        store.execute(query)
    }

    private func fetchTodaySum(type: HKQuantityType, unit: HKUnit, then: @escaping @MainActor (Double) -> Void) {
        let start = Calendar.current.startOfDay(for: .now)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: .now)
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
            let value = stats?.sumQuantity()?.doubleValue(for: unit) ?? 0
            Task { @MainActor in then(value) }
        }
        store.execute(query)
    }

    // MARK: - Risk

    private func updateRisk() {
        stressLevel = StressLevel.compute(hr: heartRate, hrv: hrv, restingHR: restingHR)
        let previous = riskLevel
        riskLevel = LongQTRisk.compute(
            hr: heartRate,
            hrv: hrv,
            irregularRhythm: irregularRhythmDetected,
            isAsleep: isAsleep,
            stress: stressLevel
        )
        guard riskLevel != previous, riskLevel != .normal else { return }
        onRiskElevated(riskLevel)
    }

    /// TODO: add HTTP call to lambda endpoint here.
    private func onRiskElevated(_ risk: LongQTRisk) {
        print("[LongQT] Risk alert — level: \(risk.label), hr: \(Int(heartRate)) bpm, hrv: \(Int(hrv)) ms, rr: \(Int(rrIntervalMs)) ms, stress: \(stressLevel.label), asleep: \(isAsleep), irregularRhythm: \(irregularRhythmDetected)")
        let haptic: WKHapticType = risk == .elevated ? .notification : .directionUp
        WKInterfaceDevice.current().play(haptic)
        sendNotification(for: risk)
    }

    private func requestNotificationPermission() async {
        try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound])
    }

    private func sendNotification(for risk: LongQTRisk) {
        let content = UNMutableNotificationContent()

        switch risk {
        case .elevated:
            content.title = "⚠️ High Long QT Risk"
            content.body  = notificationBody(prefix: "Multiple risk factors detected.")
        case .caution:
            content.title = "Long QT Caution"
            content.body  = notificationBody(prefix: "Monitor your condition closely.")
        case .normal:
            return
        }

        content.sound = .defaultCritical
        content.attachments = notificationAttachment(for: risk).map { [$0] } ?? []

        let request = UNNotificationRequest(
            identifier: "longqt-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request) { error in
            if let error { print("[Notify] Failed: \(error)") }
        }
    }

    /// Loads heart-alert.png from the app bundle as a notification thumbnail.
    /// Add heart-alert.png to the Xcode project (drag into HeartBeat Watch App group,
    /// check "Add to target: HeartBeat Watch App").
    private func notificationAttachment(for risk: LongQTRisk) -> UNNotificationAttachment? {
        let imageName = risk == .elevated ? "heart-alert" : "heart-caution"
        guard let url = Bundle.main.url(forResource: imageName, withExtension: "png") else { return nil }
        return try? UNNotificationAttachment(identifier: imageName, url: url)
    }

    private func notificationBody(prefix: String) -> String {
        var parts = [prefix]
        if heartRate > 0  { parts.append("HR: \(Int(heartRate)) bpm") }
        if hrv > 0        { parts.append("HRV: \(Int(hrv)) ms") }
        if isAsleep       { parts.append("Detected during sleep.") }
        if irregularRhythmDetected { parts.append("Irregular rhythm detected.") }
        return parts.joined(separator: " ")
    }

    // MARK: - Simulation (debug only)

#if DEBUG
    func simulateSamples() {
        // Cycle: normal → caution → elevated → normal …
        switch riskLevel {
        case .normal:
            // Caution: score 1 — mildly elevated HR above resting (stress) + borderline HRV
            heartRate    = Double.random(in: 110...129)
            hrv          = Double.random(in: 15...22)
            restingHR    = 70
            irregularRhythmDetected = false
            isAsleep     = false
        case .caution:
            // Elevated: bradycardia during sleep + very low HRV + irregular rhythm
            heartRate    = Double.random(in: 38...44)
            hrv          = Double.random(in: 5...9)
            irregularRhythmDetected = true
            isAsleep     = true
        case .elevated:
            // Back to normal
            heartRate    = Double.random(in: 60...80)
            hrv          = Double.random(in: 45...70)
            irregularRhythmDetected = false
            isAsleep     = false
        }
        rrIntervalMs  = 60000.0 / heartRate
        steps        += Double.random(in: 200...1000)
        activeEnergy += Double.random(in: 10...80)
        updateRisk()

        writeToHealthKit(HKQuantityType(.heartRate),
                         HKQuantity(unit: .count().unitDivided(by: .minute()), doubleValue: heartRate))
        writeToHealthKit(HKQuantityType(.heartRateVariabilitySDNN),
                         HKQuantity(unit: .secondUnit(with: .milli), doubleValue: hrv))
    }

    private func writeToHealthKit(_ type: HKQuantityType, _ quantity: HKQuantity) {
        let sample = HKQuantitySample(type: type, quantity: quantity, start: .now, end: .now)
        store.save(sample) { _, error in
            if let error { print("[HK] Simulate write error: \(error)") }
        }
    }
#endif
}

// MARK: - HKWorkoutSessionDelegate

extension HealthKitManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(
        _ session: HKWorkoutSession,
        didChangeTo toState: HKWorkoutSessionState,
        from fromState: HKWorkoutSessionState,
        date: Date
    ) {
        print("[HK] Workout session: \(fromState.rawValue) → \(toState.rawValue)")
        if toState == .ended {
            Task { @MainActor [weak self] in self?.startWorkoutSession() }
        }
    }

    nonisolated func workoutSession(_ session: HKWorkoutSession, didFailWithError error: Error) {
        print("[HK] Workout session failed: \(error) — restarting")
        Task { @MainActor [weak self] in self?.startWorkoutSession() }
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension HealthKitManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(
        _ workoutBuilder: HKLiveWorkoutBuilder,
        didCollectDataOf collectedTypes: Set<HKSampleType>
    ) {
        let hrUnit   = HKUnit.count().unitDivided(by: .minute())
        let kcalUnit = HKUnit.kilocalorie()

        for type in collectedTypes {
            guard let qty = type as? HKQuantityType else { continue }
            switch qty {
            case HKQuantityType(.heartRate):
                guard let bpm = workoutBuilder.statistics(for: qty)?.mostRecentQuantity()?.doubleValue(for: hrUnit),
                      bpm > 0 else { continue }
                Task { @MainActor [weak self] in
                    self?.heartRate    = bpm
                    self?.rrIntervalMs = 60000.0 / bpm
                    self?.updateRisk()
                }
            case HKQuantityType(.activeEnergyBurned):
                guard let kcal = workoutBuilder.statistics(for: qty)?.sumQuantity()?.doubleValue(for: kcalUnit) else { continue }
                Task { @MainActor [weak self] in self?.activeEnergy = kcal }
            default:
                break
            }
        }
    }
}
