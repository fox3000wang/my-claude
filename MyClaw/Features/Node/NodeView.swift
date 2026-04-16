import SwiftUI

struct NodeView: View {
    @StateObject private var viewModel = NodeViewModel()

    var body: some View {
        NavigationStack {
            List {
                // Status Section
                Section {
                    HStack {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 12, height: 12)
                        Text(viewModel.status.displayName)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                } header: {
                    Text("Node Status")
                }

                // Capabilities Section
                Section {
                    ForEach(viewModel.capabilities) { capability in
                        CapabilityRow(
                            capability: capability,
                            onToggle: { viewModel.toggleCapability(capability) }
                        )
                    }
                } header: {
                    HStack {
                        Text("Capabilities")
                        Spacer()
                        Text("\(viewModel.enabledCount) enabled")
                            .foregroundColor(.secondary)
                            .font(.caption)
                    }
                } footer: {
                    Text("Enable or disable capabilities exposed to the Gateway. Changes take effect on next connection.")
                }

                // Device Info Section
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Device ID")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(viewModel.deviceId)
                            .font(.system(.caption2, design: .monospaced))
                            .textSelection(.enabled)
                    }
                } header: {
                    Text("Device Information")
                }
            }
            .navigationTitle("Node")
        }
    }

    private var statusColor: Color {
        switch viewModel.status {
        case .connected: return .green
        case .connecting, .paired: return .yellow
        case .disconnected: return .gray
        case .error: return .red
        }
    }
}

// MARK: - Capability Row

struct CapabilityRow: View {
    let capability: Capability
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Image(systemName: iconForCapability(capability.id))
                .foregroundColor(capability.isEnabled ? .accentColor : .secondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(capability.displayName)
                    .foregroundColor(.primary)

                Text(commandsText)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { capability.isEnabled },
                set: { _ in onToggle() }
            ))
            .labelsHidden()
        }
        .contentShape(Rectangle())
        .onTapGesture { onToggle() }
    }

    private func iconForCapability(_ id: String) -> String {
        switch id {
        case "canvas": return "rectangle.on.rectangle"
        case "camera": return "camera"
        case "screen": return "record.circle"
        case "location": return "location"
        case "voice": return "waveform"
        default: return "questionmark.circle"
        }
    }

    private var commandsText: String {
        capability.commands.joined(separator: ", ")
    }
}
