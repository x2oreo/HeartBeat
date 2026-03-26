import SwiftUI

@main
struct HeartBeatApp: App {
    @StateObject private var hk = HealthKitManager()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                ContentView()
            }
            .environmentObject(hk)
        }
        // Flush offline buffer when woken for background app refresh
        .backgroundTask(.appRefresh("com.heartbeat.flush")) {
            await hk.supabase.flush()
        }
    }
}
