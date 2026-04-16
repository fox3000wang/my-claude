import SwiftUI

struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    @State private var newEndpointHost = ""
    @State private var newEndpointPort = "\(Constants.Gateway.defaultPort)"
    @State private var newEndpointName = ""
    @State private var newEndpointTLS = false

    var body: some View {
        NavigationStack {
            Form {
                // Gateway Configuration
                gatewaySection

                // Discovery Settings
                discoverySection

                // Gateways List
                gatewaysSection

                // Reset Section
                resetSection

                // About Section
                aboutSection
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $viewModel.showAddEndpoint) {
                addEndpointSheet
            }
            .alert("Reset Pairing", isPresented: $viewModel.showResetConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Reset", role: .destructive) {
                    Task { await viewModel.resetPairing() }
                }
            } message: {
                Text("This will remove the pairing token and disconnect from the Gateway. You can pair again later.")
            }
        }
    }

    // MARK: - Gateway Section

    private var gatewaySection: some View {
        Section {
            if let endpoint = viewModel.selectedEndpoint {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Selected Gateway")
                            .foregroundColor(.secondary)
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }

                    Text(endpoint.name)
                        .font(.headline)
                    Text(endpoint.host)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Port: \(endpoint.port)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
            } else {
                Text("No Gateway selected")
                    .foregroundColor(.secondary)
            }
        } header: {
            Text("Gateway")
        }
    }

    // MARK: - Discovery Section

    private var discoverySection: some View {
        Section {
            Toggle("Auto Discovery (Bonjour)", isOn: Binding(
                get: { viewModel.autoDiscovery },
                set: { viewModel.saveAutoDiscovery($0) }
            ))
        } header: {
            Text("Discovery")
        } footer: {
            Text("Automatically discover Gateways on the local network using Bonjour.")
        }
    }

    // MARK: - Gateways Section

    private var gatewaysSection: some View {
        Section {
            if viewModel.endpoints.isEmpty {
                Text("No saved gateways")
                    .foregroundColor(.secondary)
            } else {
                ForEach(viewModel.endpoints) { endpoint in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(endpoint.name)
                                .font(.body)
                            Text("\(endpoint.host):\(endpoint.port)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        if viewModel.selectedEndpoint?.id == endpoint.id {
                            Image(systemName: "checkmark")
                                .foregroundColor(.accentColor)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        viewModel.selectEndpoint(endpoint)
                    }
                }
                .onDelete { indexSet in
                    for index in indexSet {
                        viewModel.removeEndpoint(viewModel.endpoints[index])
                    }
                }
            }

            Button(action: { viewModel.showAddEndpoint = true }) {
                Label("Add Gateway Manually", systemImage: "plus.circle")
            }
        } header: {
            Text("Saved Gateways")
        }
    }

    // MARK: - Reset Section

    private var resetSection: some View {
        Section {
            Button(action: { viewModel.showResetConfirmation = true }) {
                HStack {
                    Text("Reset Pairing")
                    Spacer()
                    if viewModel.isResetting {
                        ProgressView()
                    }
                }
            }
            .disabled(viewModel.isResetting)

            Button(action: { Task { await viewModel.resetAllData() } }) {
                HStack {
                    Text("Reset All Data")
                    Spacer()
                    if viewModel.isResetting {
                        ProgressView()
                    }
                }
            }
            .foregroundColor(.red)
            .disabled(viewModel.isResetting)
        } header: {
            Text("Reset")
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section {
            HStack {
                Text("Version")
                Spacer()
                Text(viewModel.appVersion)
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Platform")
                Spacer()
                Text("iOS")
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Protocol")
                Spacer()
                Text("v\(Constants.Gateway.protocolVersion)")
                    .foregroundColor(.secondary)
            }
        } header: {
            Text("About")
        }
    }

    // MARK: - Add Endpoint Sheet

    private var addEndpointSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name (optional)", text: $newEndpointName)
                    TextField("Host", text: $newEndpointHost)
                        .autocapitalization(.none)
                        .keyboardType(.URL)
                    TextField("Port", text: $newEndpointPort)
                        .keyboardType(.numberPad)
                    Toggle("Use TLS", isOn: $newEndpointTLS)
                } header: {
                    Text("Gateway Details")
                }
            }
            .navigationTitle("Add Gateway")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        viewModel.showAddEndpoint = false
                        clearForm()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        addEndpoint()
                        viewModel.showAddEndpoint = false
                        clearForm()
                    }
                    .disabled(newEndpointHost.isEmpty)
                }
            }
        }
    }

    private func addEndpoint() {
        guard !newEndpointHost.isEmpty else { return }

        let port = Int(newEndpointPort) ?? Constants.Gateway.defaultPort
        let endpoint = GatewayEndpoint(
            name: newEndpointName.isEmpty ? newEndpointHost : newEndpointName,
            host: newEndpointHost,
            port: port,
            useTLS: newEndpointTLS
        )
        viewModel.addEndpoint(endpoint)
    }

    private func clearForm() {
        newEndpointHost = ""
        newEndpointPort = "\(Constants.Gateway.defaultPort)"
        newEndpointName = ""
        newEndpointTLS = false
    }
}
