import SwiftUI

/// View displayed when the watch is not yet paired with the HeartGuard web app.
/// The user enters a 6-digit code generated from Settings > Pair Watch on the web.
struct PairingView: View {
    @EnvironmentObject var apiClient: WatchAPIClient

    @State private var code = ""
    @State private var serverURL = "https://heartguard.vercel.app"
    @State private var isPairing = false
    @State private var errorMessage: String?
    @State private var showServerURL = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "applewatch.and.arrow.forward")
                    .font(.system(size: 28))
                    .foregroundStyle(.blue)

                Text("Pair with HeartGuard")
                    .font(.headline)

                Text("Open HeartGuard on your phone or computer, go to Settings, and tap \"Pair Watch\".")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 4)

                TextField("6-digit code", text: $code)
                    .multilineTextAlignment(.center)
                    .font(.title3.monospacedDigit())
                    .textContentType(.oneTimeCode)

                if showServerURL {
                    TextField("Server URL", text: $serverURL)
                        .font(.caption2)
                        .textContentType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption2)
                        .foregroundStyle(.red)
                }

                Button {
                    Task { await pair() }
                } label: {
                    if isPairing {
                        ProgressView()
                    } else {
                        Text("Pair")
                            .fontWeight(.semibold)
                    }
                }
                .disabled(code.count != 6 || isPairing)
                .buttonStyle(.borderedProminent)

                Button {
                    showServerURL.toggle()
                } label: {
                    Text(showServerURL ? "Hide server URL" : "Custom server")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Setup")
    }

    private func pair() async {
        isPairing = true
        errorMessage = nil

        let trimmedURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        do {
            let success = try await apiClient.exchangePairingCode(code, serverURL: trimmedURL)
            if !success {
                errorMessage = "Invalid or expired code. Try again."
            }
        } catch {
            errorMessage = "Connection failed. Check your internet."
        }

        isPairing = false
    }
}
