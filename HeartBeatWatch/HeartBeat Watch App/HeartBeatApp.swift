import SwiftUI
import UserNotifications

@main
struct HeartBeatApp: App {
    @StateObject private var hk = HealthKitManager()

    init() {
        // Allow notifications to appear even when the app is in the foreground
        UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView()
            }
            .environmentObject(hk)
        }
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
