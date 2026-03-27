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
    @Published var oxygenSaturation: Double = 0
    @Published var respiratoryRate: Double = 0

    /// The user's LQTS genotype — fetched from server config.
    /// Determines which triggers are weighted most heavily in risk scoring.
    @Published var genotype: LQTSGenotype = .unknown

    /// Whether the user recently scanned a QT-prolonging drug.
    /// Set by push notification from the web app; auto-clears after 4 hours.
    @Published var recentDrugRisk = false
    private var drugRiskTimer: Timer?

    /// Heart rate recovery: HR drop (bpm) in the first minute after exercise ends.
    /// < 12 bpm/min = abnormal for LQTS patients.
    @Published var hrRecovery: Double?
    private var peakExerciseHR: Double = 0
    private var exerciseEndTime: Date?

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
            HKQuantityType(.oxygenSaturation),
            HKQuantityType(.respiratoryRate),
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
            await loadGenotypeFromServer()
        } catch {
            print("[HK] Auth failed: \(error)")
        }
    }

    // MARK: - Genotype loading from server

    private func loadGenotypeFromServer() async {
        guard let config = await WatchAPIClient.shared.fetchConfig() else { return }
        if let gt = config.genotype {
            genotype = LQTSGenotype(rawValue: gt) ?? .unknown
        }
    }

    // MARK: - Drug risk management

    /// Called when a push notification arrives saying a risky drug was scanned.
    /// Elevates monitoring for 4 hours (typical peak plasma level window).
    func activateDrugRiskWindow() {
        recentDrugRisk = true
        drugRiskTimer?.invalidate()
        drugRiskTimer = Timer.scheduledTimer(withTimeInterval: 4 * 3600, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.recentDrugRisk = false
                self?.updateRisk()
            }
        }
        updateRisk()
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

    // MARK: - Observer queries

    private func startObservers() {
        observeQuantity(.stepCount)
        observeQuantity(.heartRateVariabilitySDNN)
        observeQuantity(.restingHeartRate)
        observeQuantity(.oxygenSaturation)
        observeQuantity(.respiratoryRate)
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
        case .oxygenSaturation:
            fetchLatest(type: HKQuantityType(.oxygenSaturation), unit: .percent()) { [weak self] value in
                self?.oxygenSaturation = value * 100 // Convert 0-1 to 0-100
                self?.updateRisk()
            }
        case .respiratoryRate:
            fetchLatest(type: HKQuantityType(.respiratoryRate), unit: .count().unitDivided(by: .minute())) { [weak self] value in
                self?.respiratoryRate = value
                self?.updateRisk()
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

    // MARK: - Heart Rate Recovery tracking

    /// Track peak exercise HR for recovery calculation.
    /// Called each time HR updates — identifies exercise cessation.
    private func trackHRRecovery(currentHR: Double) {
        // Track peak during active periods (HR > 100 bpm)
        if currentHR > 100 {
            if currentHR > peakExerciseHR {
                peakExerciseHR = currentHR
            }
            exerciseEndTime = nil // Still exercising
        } else if peakExerciseHR > 100 && exerciseEndTime == nil {
            // Exercise just ended — record the time
            exerciseEndTime = Date()
        }

        // Calculate recovery 60 seconds after exercise ends
        if let endTime = exerciseEndTime,
           peakExerciseHR > 100,
           Date().timeIntervalSince(endTime) >= 60 && Date().timeIntervalSince(endTime) < 120 {
            hrRecovery = peakExerciseHR - currentHR
            print("[HK] HR Recovery: \(Int(hrRecovery ?? 0)) bpm/min (peak: \(Int(peakExerciseHR)), current: \(Int(currentHR)))")
        }

        // Reset after 5 minutes post-exercise
        if let endTime = exerciseEndTime, Date().timeIntervalSince(endTime) > 300 {
            peakExerciseHR = 0
            exerciseEndTime = nil
            hrRecovery = nil
        }
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
            stress: stressLevel,
            genotype: genotype,
            oxygenSaturation: oxygenSaturation,
            respiratoryRate: respiratoryRate,
            hrRecovery: hrRecovery,
            recentDrugRisk: recentDrugRisk
        )

        // Send periodic health data to the web backend (throttled to every 30s inside the client)
        Task {
            await WatchAPIClient.shared.sendHealthDataIfNeeded(
                heartRate: heartRate,
                hrv: hrv,
                restingHR: restingHR,
                rrIntervalMs: rrIntervalMs,
                steps: steps,
                activeEnergy: activeEnergy,
                riskLevel: riskLevel,
                stressLevel: stressLevel,
                isAsleep: isAsleep,
                irregularRhythm: irregularRhythmDetected
            )
        }

        guard riskLevel != previous, riskLevel != .normal else { return }
        onRiskElevated(riskLevel)
    }

    private func onRiskElevated(_ risk: LongQTRisk) {
        print("[LongQT] Risk alert — level: \(risk.label), hr: \(Int(heartRate)) bpm, hrv: \(Int(hrv)) ms, rr: \(Int(rrIntervalMs)) ms, stress: \(stressLevel.label), asleep: \(isAsleep), irregularRhythm: \(irregularRhythmDetected), genotype: \(genotype.rawValue), SpO2: \(Int(oxygenSaturation))%, RR: \(Int(respiratoryRate))/min")
        let haptic: WKHapticType = risk == .elevated ? .notification : .directionUp
        WKInterfaceDevice.current().play(haptic)
        sendNotification(for: risk)

        // Send alert to web backend
        Task {
            await WatchAPIClient.shared.sendAlert(
                riskLevel: risk,
                heartRate: heartRate,
                hrv: hrv,
                stressLevel: stressLevel,
                isAsleep: isAsleep,
                irregularRhythm: irregularRhythmDetected
            )
        }
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

    private func notificationAttachment(for risk: LongQTRisk) -> UNNotificationAttachment? {
        let imageName = risk == .elevated ? "heart-alert" : "heart-caution"
        guard let url = Bundle.main.url(forResource: imageName, withExtension: "png") else { return nil }
        return try? UNNotificationAttachment(identifier: imageName, url: url)
    }

    private func notificationBody(prefix: String) -> String {
        var parts = [prefix]
        if heartRate > 0  { parts.append("HR: \(Int(heartRate)) bpm") }
        if hrv > 0        { parts.append("HRV: \(Int(hrv)) ms") }
        if oxygenSaturation > 0 && oxygenSaturation < 94 { parts.append("SpO2: \(Int(oxygenSaturation))%") }
        if isAsleep       { parts.append("Detected during sleep.") }
        if irregularRhythmDetected { parts.append("Irregular rhythm detected.") }
        if recentDrugRisk { parts.append("QT-prolonging drug active.") }
        return parts.joined(separator: " ")
    }

    // MARK: - Simulation (debug only)

#if DEBUG
    func simulateSamples() {
        // Cycle: normal → caution → elevated → normal …
        switch riskLevel {
        case .normal:
            heartRate    = Double.random(in: 110...129)
            hrv          = Double.random(in: 15...22)
            restingHR    = 70
            oxygenSaturation = 97
            respiratoryRate = 16
            irregularRhythmDetected = false
            isAsleep     = false
        case .caution:
            heartRate    = Double.random(in: 38...44)
            hrv          = Double.random(in: 5...9)
            oxygenSaturation = 93
            respiratoryRate = 22
            irregularRhythmDetected = true
            isAsleep     = true
        case .elevated:
            heartRate    = Double.random(in: 60...80)
            hrv          = Double.random(in: 45...70)
            oxygenSaturation = 98
            respiratoryRate = 14
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
                    self?.trackHRRecovery(currentHR: bpm)
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
