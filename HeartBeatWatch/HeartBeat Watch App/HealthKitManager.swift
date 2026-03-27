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
    @Published var isWarmingUp = true
    @Published var oxygenSaturation: Double = 0
    @Published var respiratoryRate: Double = 0

    private var warmupTimer: Timer?

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

    // MARK: - Remote debug logging (sends to Mac on same WiFi)
    // Run on Mac: python3 ~/hk_log_server.py
    private let remoteLogURL = URL(string: "http://10.1.85.215:4567/log")!

    private func remoteLog(_ msg: String) {
        let line = "[\(timestamp())] \(msg)"
        print(line)
        var req = URLRequest(url: remoteLogURL)
        req.httpMethod = "POST"
        req.httpBody = (line + "\n").data(using: .utf8)
        req.timeoutInterval = 1
        URLSession.shared.dataTask(with: req).resume()
    }

    private func timestamp() -> String {
        let f = DateFormatter()
        f.dateFormat = "HH:mm:ss.SSS"
        return f.string(from: Date())
    }

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
            remoteLog("[AUTH] HealthKit authorized")
            await requestNotificationPermission()
            #if targetEnvironment(simulator)
            isWarmingUp = false
            #else
            startWorkoutSession()
            startObservers()
            fetchInitialValues()
            warmupTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false) { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.isWarmingUp = false
                    self?.remoteLog("[WARMUP] Complete — risk scoring active")
                }
            }
            #endif
            await loadGenotypeFromServer()
        } catch {
            remoteLog("[AUTH] Failed: \(error)")
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
            // Explicitly enable HRV collection (not included by default for .other type)
            builder.dataSource?.enableCollection(for: HKQuantityType(.heartRateVariabilitySDNN), predicate: nil)
            session.startActivity(with: .now)
            builder.beginCollection(withStart: .now) { [weak self] _, error in
                if let error {
                    self?.remoteLog("[WORKOUT] beginCollection error: \(error)")
                } else {
                    self?.remoteLog("[WORKOUT] Collection started — HR sensor active")
                }
            }
            remoteLog("[WORKOUT] Session created, starting activity")
        } catch {
            remoteLog("[WORKOUT] Session unavailable: \(error) — using observer queries only")
        }
    }

    // MARK: - Observer queries

    /// Immediately shows the last recorded values so the UI isn't empty on open.
    /// The workout builder will overwrite these with live data as new readings arrive.
    private func fetchInitialValues() {
        remoteLog("[FETCH] fetchInitialValues() called")
        fetchLatest(type: HKQuantityType(.heartRate), unit: .count().unitDivided(by: .minute())) { [weak self] value in
            guard let self else { return }
            self.remoteLog("[FETCH] heartRate query returned \(value) bpm (current=\(self.heartRate))")
            guard self.heartRate == 0 else { return }
            self.heartRate    = value
            self.rrIntervalMs = 60000.0 / value
            self.updateRisk()
        }
        fetchLatest(type: HKQuantityType(.heartRateVariabilitySDNN), unit: .secondUnit(with: .milli)) { [weak self] value in
            guard let self else { return }
            self.remoteLog("[FETCH] SDNN query returned \(value) ms")
            guard self.hrv == 0 else { return }
            self.hrv = value
            self.updateRisk()
        }
        fetchLatest(type: HKQuantityType(.restingHeartRate), unit: .count().unitDivided(by: .minute())) { [weak self] value in
            guard let self else { return }
            self.remoteLog("[FETCH] restingHR query returned \(value) bpm")
            guard self.restingHR == 0 else { return }
            self.restingHR = value
        }
        fetchTodaySum(type: HKQuantityType(.stepCount), unit: .count()) { [weak self] value in
            self?.steps = value
        }
        fetchLatest(type: HKQuantityType(.oxygenSaturation), unit: .percent()) { [weak self] value in
            guard let self, self.oxygenSaturation == 0 else { return }
            self.oxygenSaturation = value * 100
            self.updateRisk()
        }
        fetchLatest(type: HKQuantityType(.respiratoryRate), unit: .count().unitDivided(by: .minute())) { [weak self] value in
            guard let self, self.respiratoryRate == 0 else { return }
            self.respiratoryRate = value
            self.updateRisk()
        }
    }

    private func startObservers() {
        observeRealTime(.heartRate) { [weak self] value, _ in
            guard let self else { return }
            self.heartRate    = value
            self.rrIntervalMs = 60000.0 / value
            self.updateRisk()
        }
        observeRealTime(.heartRateVariabilitySDNN) { [weak self] value, _ in
            guard let self else { return }
            self.hrv = value
            self.updateRisk()
        }
        observeQuantity(.stepCount)
        observeQuantity(.restingHeartRate)
        observeQuantity(.oxygenSaturation)
        observeQuantity(.respiratoryRate)
        observeIrregularRhythm()
        observeSleep()
    }

    /// HKAnchoredObjectQuery fires on every new sample — real-time updates as long as
    /// the workout session keeps the sensor active.
    private func observeRealTime(
        _ identifier: HKQuantityTypeIdentifier,
        onValue: @escaping @MainActor (Double, Date) -> Void
    ) {
        let type = HKQuantityType(identifier)
        let unit = unit(for: identifier)

        let handler: @Sendable (HKAnchoredObjectQuery, [HKSample]?, [HKDeletedObject]?, HKQueryAnchor?, Error?) -> Void = { [weak self] _, samples, _, _, error in
            if let error {
                Task { @MainActor in self?.remoteLog("[ANCHOR:\(identifier.rawValue)] error: \(error)") }
                return
            }
            guard let samples = samples as? [HKQuantitySample], let latest = samples.last else {
                Task { @MainActor in self?.remoteLog("[ANCHOR:\(identifier.rawValue)] fired — 0 samples") }
                return
            }
            let value = latest.quantity.doubleValue(for: unit)
            Task { @MainActor in
                self?.remoteLog("[ANCHOR:\(identifier.rawValue)] → \(String(format: "%.2f", value)) (sampleDate: \(latest.endDate))")
                onValue(value, latest.endDate)
            }
        }

        let query = HKAnchoredObjectQuery(
            type: type, predicate: nil, anchor: nil, limit: HKObjectQueryNoLimit,
            resultsHandler: handler
        )
        query.updateHandler = handler
        store.execute(query)
        store.enableBackgroundDelivery(for: type, frequency: .immediate) { _, _ in }
    }

    private func unit(for identifier: HKQuantityTypeIdentifier) -> HKUnit {
        switch identifier {
        case .heartRate:                return .count().unitDivided(by: .minute())
        case .heartRateVariabilitySDNN: return .secondUnit(with: .milli)
        case .restingHeartRate:         return .count().unitDivided(by: .minute())
        default:                        return .count()
        }
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
        guard !isWarmingUp else { return }
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
        remoteLog("[RISK] \(risk.label) — hr:\(Int(heartRate)) hrv:\(Int(hrv)) rr:\(Int(rrIntervalMs)) stress:\(stressLevel.label) asleep:\(isAsleep) irregular:\(irregularRhythmDetected) genotype:\(genotype.rawValue) SpO2:\(Int(oxygenSaturation))% RR:\(Int(respiratoryRate))/min")
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
        _ = try? await UNUserNotificationCenter.current()
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
    func simulateNormal() {
        heartRate               = Double.random(in: 62...72)
        hrv                     = Double.random(in: 42...58)
        restingHR               = 65
        oxygenSaturation        = 98
        respiratoryRate         = 14
        irregularRhythmDetected = false
        isAsleep                = false
        rrIntervalMs            = 60000.0 / heartRate
        steps                  += Double.random(in: 200...600)
        activeEnergy           += Double.random(in: 10...40)
        updateRisk()
    }

    func simulateRisk() {
        heartRate               = Double.random(in: 38...44)   // Bradycardia → LQT3 trigger
        hrv                     = Double.random(in: 5...9)     // Very low HRV
        restingHR               = 65
        oxygenSaturation        = Double.random(in: 91...93)   // Low SpO2
        respiratoryRate         = Double.random(in: 22...25)   // Elevated
        irregularRhythmDetected = true
        isAsleep                = true
        rrIntervalMs            = 60000.0 / heartRate
        updateRisk()
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
                let stats = workoutBuilder.statistics(for: qty)
                let raw = stats?.mostRecentQuantity()?.doubleValue(for: hrUnit)
                Task { @MainActor [weak self] in
                    self?.remoteLog("[BUILDER] HR type collected — stats=\(stats != nil), raw=\(raw.map { String(format: "%.1f", $0) } ?? "nil")")
                }
                guard let bpm = raw, bpm > 0 else { continue }
                Task { @MainActor [weak self] in
                    self?.remoteLog("[BUILDER] heartRate updated → \(String(format: "%.1f", bpm)) bpm")
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
