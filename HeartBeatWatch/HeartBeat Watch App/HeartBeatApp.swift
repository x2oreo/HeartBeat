import SwiftUI
import UserNotifications
import WatchKit

@main
struct HeartBeatApp: App {
    @WKApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @StateObject private var hk = HealthKitManager()
    @StateObject private var apiClient = WatchAPIClient.shared

    init() {
        UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                if apiClient.isPaired {
                    ContentView()
                } else {
                    PairingView()
                }
            }
            .environmentObject(hk)
            .environmentObject(apiClient)
            .onAppear {
                // Share HealthKitManager reference with AppDelegate for push handling
                delegate.healthKitManager = hk
            }
        }
    }
}

// MARK: - WKApplicationDelegate for push notification registration

final class AppDelegate: NSObject, WKApplicationDelegate {
    /// Set by HeartBeatApp on appear — used to trigger drug risk window from push notifications.
    var healthKitManager: HealthKitManager?

    func applicationDidFinishLaunching() {
        WKApplication.shared().registerForRemoteNotifications()
    }

    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let tokenHex = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("[APNS] Registered with token: \(tokenHex)")
        Task { @MainActor in
            await WatchAPIClient.shared.registerDevice(apnsToken: deviceToken)
        }
    }

    func didFailToRegisterForRemoteNotificationsWithError(_ error: Error) {
        print("[APNS] Registration failed: \(error)")
    }

    func didReceiveRemoteNotification(
        _ userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (WKBackgroundFetchResult) -> Void
    ) {
        print("[APNS] Received push: \(userInfo)")

        if let type = userInfo["type"] as? String {
            switch type {
            case "drug-alert":
                let drugName = userInfo["drugName"] as? String ?? "Unknown"
                let risk = userInfo["riskCategory"] as? String ?? ""
                let message = userInfo["message"] as? String ?? "A risky medication was scanned."
                showDrugAlertNotification(drugName: drugName, riskCategory: risk, message: message)

                // Activate heightened monitoring for 4 hours (typical peak plasma window)
                Task { @MainActor in
                    healthKitManager?.activateDrugRiskWindow()
                }

            case "mode-change":
                print("[APNS] Monitoring mode change received")

            default:
                break
            }
        }

        completionHandler(.newData)
    }

    private func showDrugAlertNotification(drugName: String, riskCategory: String, message: String) {
        let content = UNMutableNotificationContent()
        content.title = "Drug Alert: \(drugName)"
        content.body = message
        content.sound = riskCategory == "KNOWN_RISK" ? .defaultCritical : .default

        let request = UNNotificationRequest(
            identifier: "drug-alert-\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)

        WKInterfaceDevice.current().play(.notification)
    }
}

/// Tells the system to show banner + play sound even when the app is open.
final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationDelegate()

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}
