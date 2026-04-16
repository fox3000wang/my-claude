import SwiftUI

struct DiscoveryView: View {
    @StateObject private var viewModel = DiscoveryViewModel()
    @Environment(\.presentationMode) private var presentationMode

    let onSelect: (GatewayEndpoint) -> Void

    var body: some View {
        NavigationStack {
            List {
                // Auto-Discovery Section
                Section {
                    if viewModel.isDiscovering {
                        HStack {
                            ProgressView()
                                .padding(.trailing, 8)
                            Text("Searching for gateways...")
                                .foregroundColor(.secondary)
                            Spacer()
                            Button("Stop") {
                                viewModel.stopDiscovery()
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                    } else {
                        Button(action: { viewModel.startDiscovery() }) {
                            Label("Start Discovery", systemImage: "antenna.radiowaves.left.and.right")
                        }
                    }
                } header: {
                    Text("Local Network")
                }

                // Discovered Gateways
                if !viewModel.discoveredEndpoints.isEmpty {
                    Section {
                        ForEach(viewModel.discoveredEndpoints) { endpoint in
                            GatewayRow(endpoint: endpoint) {
                                onSelect(endpoint)
                                presentationMode.wrappedValue.dismiss()
                            }
                        }
                    } header: {
                        HStack {
                            Text("Discovered Gateways")
                            Spacer()
                            Button(action: { viewModel.refresh() }) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.caption)
                            }
                        }
                    }
                }

                // Manual Entry Section
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        TextField("Host (IP or domain)", text: $viewModel.manualHost)
                            .autocapitalization(.none)
                            .keyboardType(.URL)
                            .textContentType(.URL)
                            .autocorrectionDisabled()

                        HStack {
                            TextField("Port", text: $viewModel.manualPort)
                                .keyboardType(.numberPad)
                                .frame(width: 100)

                            Spacer()

                            Button("Add") {
                                viewModel.addManualEndpoint()
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(viewModel.manualHost.isEmpty)
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Manual Entry")
                } footer: {
                    Text("Enter a Gateway host and port to connect manually.")
                }

                // Error Display
                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Discover Gateways")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { presentationMode.wrappedValue.dismiss() }
                }
            }
            .onAppear {
                viewModel.startDiscovery()
            }
            .onDisappear {
                viewModel.stopDiscovery()
            }
        }
    }
}

// MARK: - Gateway Row

struct GatewayRow: View {
    let endpoint: GatewayEndpoint
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                Image(systemName: "server.rack")
                    .foregroundColor(.accentColor)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 2) {
                    Text(endpoint.name)
                        .foregroundColor(.primary)

                    HStack(spacing: 8) {
                        Text(endpoint.host)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text(":")
                            .foregroundColor(.secondary)

                        Text("\(endpoint.port)")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if endpoint.useTLS {
                            Image(systemName: "lock.fill")
                                .font(.caption2)
                                .foregroundColor(.green)
                        }
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
