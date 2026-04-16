import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Connection Status Card
                    connectionStatusCard

                    // Quick Actions
                    quickActionsSection

                    // Recent Endpoints
                    if !viewModel.recentEndpoints.isEmpty {
                        recentEndpointsSection
                    }

                    // Capabilities
                    capabilitiesSection

                    Spacer(minLength: 24)

                    // Device Info
                    deviceInfoSection
                }
                .padding()
            }
            .navigationTitle("MyClaw")
            .sheet(isPresented: $viewModel.showDiscovery) {
                DiscoveryView(onSelect: { endpoint in
                    viewModel.connectedEndpoint = endpoint
                    viewModel.showDiscovery = false
                })
            }
            .sheet(isPresented: $viewModel.showPairing) {
                PairingView()
            }
            .fullScreenCover(isPresented: $viewModel.showCanvas) {
                CanvasContainerView(url: viewModel.canvasURL)
            }
        }
    }

    // MARK: - Connection Status Card

    private var connectionStatusCard: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: viewModel.statusIcon)
                    .font(.system(size: 48))
                    .foregroundColor(statusColor)

                VStack(alignment: .leading, spacing: 4) {
                    Text(viewModel.statusDisplayName)
                        .font(.headline)

                    if let endpoint = viewModel.connectedEndpoint {
                        Text(endpoint.name)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else {
                        Text("No Gateway configured")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()
            }

            // Session info
            if let sessionId = viewModel.sessionId, viewModel.connectionState == .paired {
                HStack {
                    Text("Session: \(sessionId.truncated(to: 8))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }

            // Pairing status
            if viewModel.isPaired {
                HStack {
                    Image(systemName: "checkmark.shield.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                    Text("Paired")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }

            // Connection buttons
            connectionButtons

            // Error
            if let error = viewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }

    @ViewBuilder
    private var connectionButtons: some View {
        switch viewModel.connectionState {
        case .paired:
            HStack(spacing: 12) {
                Button(action: { viewModel.disconnect() }) {
                    Label("Disconnect", systemImage: "xmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.red)

                Button(action: { Task { await viewModel.reconnect() } }) {
                    Label("Reconnect", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }

        case .connecting, .handshaking, .discovering:
            HStack {
                ProgressView()
                    .padding(.trailing, 8)
                Text(viewModel.statusDisplayName)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)

        case .idle, .error:
            Button(action: {
                if viewModel.hasEndpoint {
                    Task { await viewModel.connect() }
                } else {
                    viewModel.showDiscovery = true
                }
            }) {
                Label("Connect", systemImage: "link")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                QuickActionButton(
                    icon: "rectangle.on.rectangle",
                    title: "Canvas",
                    isEnabled: viewModel.connectionState == .paired
                ) {
                    viewModel.openCanvas()
                }

                QuickActionButton(
                    icon: "antenna.radiowaves.left.and.right",
                    title: "Discover",
                    isEnabled: true
                ) {
                    viewModel.showDiscovery = true
                }

                QuickActionButton(
                    icon: "link.badge.plus",
                    title: "Pair",
                    isEnabled: viewModel.connectionState == .idle
                ) {
                    viewModel.showPairing = true
                }

                QuickActionButton(
                    icon: "arrow.triangle.2.circlepath",
                    title: "Test",
                    isEnabled: viewModel.connectionState == .paired
                ) {
                    Task { await viewModel.testConnection() }
                }
            }
        }
    }

    // MARK: - Recent Endpoints

    private var recentEndpointsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Gateways")
                .font(.headline)

            ForEach(viewModel.recentEndpoints) { endpoint in
                Button(action: {
                    Task {
                        await viewModel.connect(to: endpoint)
                    }
                }) {
                    HStack {
                        Image(systemName: "server.rack")
                            .foregroundColor(.accentColor)

                        VStack(alignment: .leading) {
                            Text(endpoint.name)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text(endpoint.host)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        if let lastConnected = endpoint.lastConnected {
                            Text(lastConnected.relativeString)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Capabilities

    private var capabilitiesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Capabilities")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                ForEach(viewModel.capabilities) { cap in
                    CapabilityBadge(capability: cap)
                }
            }
        }
    }

    // MARK: - Device Info

    private var deviceInfoSection: some View {
        VStack(spacing: 4) {
            Text("Device ID")
                .font(.caption)
                .foregroundColor(.secondary)
            Text(viewModel.deviceId)
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(.secondary)
        }
        .padding(.top, 8)
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch viewModel.statusColor {
        case "green": return .green
        case "yellow": return .yellow
        case "red": return .red
        default: return .gray
        }
    }
}

// MARK: - Quick Action Button

struct QuickActionButton: View {
    let icon: String
    let title: String
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                Text(title)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isEnabled ? Color.accentColor.opacity(0.1) : Color.gray.opacity(0.1))
            .foregroundColor(isEnabled ? .primary : .secondary)
            .cornerRadius(12)
        }
        .disabled(!isEnabled)
    }
}

// MARK: - Capability Badge

struct CapabilityBadge: View {
    let capability: Capability

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: iconName)
                .font(.caption)
            Text(capability.id.capitalized)
                .font(.caption2)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(badgeColor.opacity(0.1))
        .foregroundColor(badgeColor)
        .cornerRadius(8)
    }

    private var iconName: String {
        switch capability.id {
        case "canvas": return "rectangle.on.rectangle"
        case "camera": return "camera"
        case "screen": return "rectangle.on.rectangle.angled"
        case "location": return "location"
        case "voice": return "waveform"
        default: return "questionmark.circle"
        }
    }

    private var badgeColor: Color {
        guard capability.isEnabled else { return .gray }
        switch capability.id {
        case "canvas": return .blue
        case "camera": return .purple
        case "screen": return .orange
        case "location": return .green
        case "voice": return .pink
        default: return .gray
        }
    }
}

// MARK: - Canvas Container

struct CanvasContainerView: View {
    let url: URL?
    @Environment(\.presentationMode) private var presentationMode
    @StateObject private var viewModel = CanvasViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                if let url = url {
                    CanvasView(viewModel: viewModel, canvasURL: url)
                } else {
                    Text("No Canvas URL configured")
                        .foregroundColor(.white)
                }
            }
            .navigationTitle("Canvas")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { presentationMode.wrappedValue.dismiss() }
                        .foregroundColor(.white)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { viewModel.reload() }) {
                        Image(systemName: "arrow.clockwise")
                            .foregroundColor(.white)
                    }
                }
            }
        }
    }
}

#Preview {
    HomeView()
}
