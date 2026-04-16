import Foundation
import Combine

@MainActor
final class DiscoveryViewModel: ObservableObject {
    @Published var discoveredEndpoints: [GatewayEndpoint] = []
    @Published var isDiscovering = false
    @Published var manualHost = ""
    @Published var manualPort = "\(Constants.Gateway.defaultPort)"
    @Published var errorMessage: String?

    private let discoveryService = DiscoveryService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        setupBindings()
    }

    private func setupBindings() {
        discoveryService.$discoveredEndpoints
            .receive(on: DispatchQueue.main)
            .assign(to: &$discoveredEndpoints)

        discoveryService.$isDiscovering
            .receive(on: DispatchQueue.main)
            .assign(to: &$isDiscovering)

        discoveryService.$lastError
            .receive(on: DispatchQueue.main)
            .compactMap { $0?.localizedDescription }
            .assign(to: &$errorMessage)
    }

    func startDiscovery() {
        discoveryService.startDiscovery()
    }

    func stopDiscovery() {
        discoveryService.stopDiscovery()
    }

    func refresh() {
        discoveryService.refresh()
    }

    func addManualEndpoint() {
        guard !manualHost.isEmpty else { return }

        let port = Int(manualPort) ?? Constants.Gateway.defaultPort
        discoveryService.addManualEndpoint(
            host: manualHost,
            port: port,
            name: manualHost
        )
        manualHost = ""
        manualPort = "\(Constants.Gateway.defaultPort)"
    }

    func removeEndpoint(_ endpoint: GatewayEndpoint) {
        discoveryService.removeEndpoint(endpoint)
    }

    var hasEndpoints: Bool {
        !discoveredEndpoints.isEmpty
    }
}
