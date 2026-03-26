import Foundation

enum Config {
    // xcconfig can't store URLs with // (parsed as comments), so we store host only.
    static let supabaseURL: String = "https://\(info("SUPABASE_HOST"))"
    static let supabaseAnonKey: String = info("SUPABASE_ANON_KEY")
    static let tableName = "health_metrics"

    private static func info(_ key: String) -> String {
        guard let value = Bundle.main.infoDictionary?[key] as? String, !value.isEmpty else {
            fatalError("Missing \(key) in Info.plist — check Secrets.xcconfig")
        }
        return value
    }
}
