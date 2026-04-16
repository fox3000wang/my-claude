import SwiftUI

struct PairingView: View {
    @StateObject private var viewModel = PairingViewModel()
    @Environment(\.dismiss) private var dismiss

    @State private var showManualCodeEntry = false
    @State private var manualCode = ""
    @State private var selectedEndpoint: GatewayEndpoint?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    Spacer().frame(height: 16)

                    // Header Icon
                    pairingIcon

                    // Status Text
                    statusText

                    // Pairing Code & QR
                    if viewModel.pairingState == .waitingForApproval {
                        pairingCodeSection
                    }

                    // Instructions
                    if viewModel.pairingState == .waitingForApproval {
                        instructionsView
                    }

                    // Error
                    if let error = viewModel.errorMessage {
                        errorView(message: error)
                    }

                    Spacer(minLength: 24)

                    // Action Buttons
                    actionButtons
                }
                .padding()
            }
            .navigationTitle("Pair with Gateway")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        viewModel.cancelPairing()
                        dismiss()
                    }
                    .disabled(viewModel.pairingState == .approved)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    if viewModel.pairingState == .unpaired {
                        Button("Select Gateway") {
                            // Will show endpoint selection
                        }
                    }
                }
            }
            .sheet(isPresented: $showManualCodeEntry) {
                manualCodeEntrySheet
            }
            .alert("Select Gateway", isPresented: .constant(selectedEndpoint == nil && viewModel.pairingState == .unpaired)) {
                Button("Cancel", role: .cancel) {
                    dismiss()
                }
            } message: {
                Text("Choose a gateway from the Discovery tab to pair with.")
            }
        }
    }

    // MARK: - Pairing Icon

    private var pairingIcon: some View {
        ZStack {
            Circle()
                .fill(iconBackgroundColor.opacity(0.2))
                .frame(width: 120, height: 120)

            Image(systemName: viewModel.iconName)
                .font(.system(size: 48))
                .foregroundColor(iconBackgroundColor)
        }
    }

    private var iconBackgroundColor: Color {
        switch viewModel.iconColor {
        case "blue": return .blue
        case "orange": return .orange
        case "green": return .green
        case "red": return .red
        default: return .gray
        }
    }

    // MARK: - Status Text

    private var statusText: some View {
        VStack(spacing: 8) {
            Text(viewModel.statusTitle)
                .font(.title2)
                .fontWeight(.semibold)

            Text(viewModel.statusSubtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Pairing Code Section

    private var pairingCodeSection: some View {
        VStack(spacing: 16) {
            // QR Code placeholder using system image
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.secondarySystemBackground))
                    .frame(width: 200, height: 200)

                Image(systemName: "qrcode")
                    .font(.system(size: 120))
                    .foregroundColor(.primary.opacity(0.6))

                // Overlay pairing code in corner
                if let code = viewModel.pairingCode {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Text(code)
                                .font(.system(.caption, design: .monospaced))
                                .fontWeight(.bold)
                                .padding(6)
                                .background(Color(.systemBackground))
                                .cornerRadius(6)
                                .padding(8)
                        }
                    }
                }
            }

            // Pairing Code Display
            if let code = viewModel.pairingCode {
                VStack(spacing: 4) {
                    Text("Pairing Code")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(code)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .tracking(8)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(12)
                }
            }

            // Manual code entry button
            Button(action: { showManualCodeEntry = true }) {
                Label("Enter Code Manually", systemImage: "keyboard")
                    .font(.subheadline)
            }
            .buttonStyle(.bordered)
        }
    }

    // MARK: - Instructions

    private var instructionsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("How to Approve")
                .font(.headline)

            instructionRow(number: 1, text: "Open the Gateway admin panel")
            instructionRow(number: 2, text: "Navigate to the Nodes section")
            instructionRow(number: 3, text: "Find \"\(viewModel.deviceName)\" in pending requests")
            instructionRow(number: 4, text: "Click Approve to complete pairing")
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }

    private func instructionRow(number: Int, text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.accentColor)
                .clipShape(Circle())

            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)

            Spacer()
        }
    }

    // MARK: - Error View

    private func errorView(message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.red)

            Spacer()
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .cornerRadius(12)
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private var actionButtons: some View {
        VStack(spacing: 12) {
            switch viewModel.pairingState {
            case .unpaired:
                Button(action: {
                    // Show gateway selection via DiscoveryView
                }) {
                    Label("Select Gateway", systemImage: "antenna.radiowaves.left.and.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)

            case .waitingForApproval:
                if viewModel.isLoading {
                    HStack {
                        ProgressView()
                        Text("Sending request...")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                }

                Button(action: { viewModel.cancelPairing() }) {
                    Text("Cancel")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

            case .approved:
                successView

            case .rejected, .error:
                if viewModel.canRetry {
                    Button(action: { viewModel.resetPairing() }) {
                        Text("Try Again")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                }

                Button(action: { dismiss() }) {
                    Text("Close")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }

    private var successView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundColor(.green)

            Text("Pairing Complete!")
                .font(.headline)

            Text("Your device is now connected to the Gateway.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button(action: { dismiss() }) {
                Text("Done")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Manual Code Entry Sheet

    private var manualCodeEntrySheet: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text("Enter the 6-digit pairing code shown on the Gateway")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top)

                TextField("XXXXXX", text: $manualCode)
                    .font(.system(size: 32, weight: .bold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .textContentType(.oneTimeCode)
                    .keyboardType(.asciiCapable)
                    .autocapitalization(.allCharacters)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    .onChange(of: manualCode) { newValue in
                        // Limit to 6 characters, uppercase
                        if newValue.count > 6 {
                            manualCode = String(newValue.prefix(6))
                        }
                        manualCode = newValue.uppercased()
                    }

                Button(action: {
                    Task {
                        await viewModel.approvePairing(with: manualCode)
                        showManualCodeEntry = false
                    }
                }) {
                    Text("Approve Pairing")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(manualCode.count != 6)

                Spacer()
            }
            .padding()
            .navigationTitle("Manual Code Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        showManualCodeEntry = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

#Preview {
    PairingView()
}
