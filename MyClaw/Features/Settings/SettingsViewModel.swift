import Foundation
import Combine

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var endpoints: [GatewayEndpoint] = []
    @Published var autoDiscovery: Bool = true
    @Published var selectedEndpoint: GatewayEndpoint?
    @Published var showAddEndpoint = false
    @Published var showResetConfirmation = false
    @Published var isResetting = false
    @Published var appVersion: String = Constants.App.version

    private let gatewayClient = GatewayClient.shared
    private let keychainService = KeychainService.shared
    private let pairingService = PairingService.shared

    init() {
        loadSettings()
    }

    func loadSettings() {
        endpoints = gatewayClient.loadEndpoints()
        autoDiscovery = UserDefaults.standard.bool(forKey: Constants.UserDefaults.autoDiscoveryKey)
    }

    func saveAutoDiscovery(_ enabled: Bool) {
        autoDiscovery = enabled
        UserDefaults.standard.set(enabled, forKey: Constants.UserDefaults.autoDiscoveryKey)
    }

    func addEndpoint(_ endpoint: GatewayEndpoint) {
        if !endpoints.contains(where: { $0.id == endpoint.id }) {
            endpoints.append(endpoint)
            gatewayClient.saveEndpoints(endpoints)
        }
    }

    func removeEndpoint(_ endpoint: GatewayEndpoint) {
        endpoints.removeAll { $0.id == endpoint.id }
        gatewayClient.saveEndpoints(endpoints)
    }

    func selectEndpoint(_ endpoint: GatewayEndpoint) {
        selectedEndpoint = endpoint
    }

    func resetPairing() async {
        isResetting = true
        do {
            try pairingService.resetPairing()
            try keychainService.deletePairingInfo()
            try keychainService.deleteDeviceToken()
            gatewayClient.disconnect()
        } catch {
            // Handle error silently
        }
        isResetting = false
    }

    func resetAllData() async {
        isResetting = true
        do {
            try keychainService.clearAll()
            endpoints = []
            gatewayClient.saveEndpoints([])
            gatewayClient.disconnect()
        } catch {
            // Handle error silently
        }
        isResetting = false
    }

    var hasExistingPairing: Bool {
        pairingService.hasExistingPairing()
    }

    var pairingInfo: PairingInfo? {
        try? keychainService.loadPairingInfo()
    }
}
