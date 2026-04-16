import Foundation
import Network
import Combine

@MainActor
final class DiscoveryService: ObservableObject {
    @Published private(set) var discoveredEndpoints: [GatewayEndpoint] = []
    @Published private(set) var isDiscovering = false
    @Published private(set) var lastError: Error?

    private var browser: NWBrowser?
    private var cancellables = Set<AnyCancellable>()

    static let shared = DiscoveryService()

    private init() {}

    // MARK: - Start Discovery

    func startDiscovery() {
        guard !isDiscovering else { return }

        isDiscovering = true
        lastError = nil
        discoveredEndpoints = []

        let parameters = NWParameters()
        parameters.includePeerToPeer = true

        let browser = NWBrowser(
            for: .bonjour(type: Constants.Gateway.bonjourServiceType, domain: Constants.Gateway.bonjourDomain),
            using: parameters
        )

        browser.stateUpdateHandler = { [weak self] state in
            Task { @MainActor in
                self?.handleBrowserState(state)
            }
        }

        browser.browseResultsChangedHandler = { [weak self] results, changes in
            Task { @MainActor in
                self?.handleBrowseResults(results, changes: changes)
            }
        }

        browser.start(queue: .main)
        self.browser = browser
    }

    // MARK: - Stop Discovery

    func stopDiscovery() {
        browser?.cancel()
        browser = nil
        isDiscovering = false
    }

    // MARK: - Handle Browser State

    private func handleBrowserState(_ state: NWBrowser.State) {
        switch state {
        case .ready:
            isDiscovering = true
        case .failed(let error):
            lastError = error
            isDiscovering = false
        case .cancelled:
            isDiscovering = false
        case .setup, .waiting:
            break
        @unknown default:
            break
        }
    }

    // MARK: - Handle Browse Results

    private func handleBrowseResults(_ results: Set<NWBrowser.Result>, changes: Set<NWBrowser.Result.Change>) {
        for change in changes {
            switch change {
            case .added(let result):
                if case .service(let name, _, _, _) = result.endpoint {
                    resolveEndpoint(from: result, name: name)
                }
            case .removed(let result):
                if case .service(let name, _, _, _) = result.endpoint {
                    discoveredEndpoints.removeAll { $0.name == name }
                }
            case .changed(old: _, new: let new, flags: _):
                if case .service(let name, _, _, _) = new.endpoint {
                    resolveEndpoint(from: new, name: name)
                }
            case .identical:
                break
            @unknown default:
                break
            }
        }
    }

    // MARK: - Resolve Endpoint

    private func resolveEndpoint(from result: NWBrowser.Result, name: String) {
        let connection = NWConnection(to: result.endpoint, using: .tcp)
        connection.stateUpdateHandler = { [weak self] state in
            Task { @MainActor in
                if case .ready = state {
                    if let endpoint = self?.buildEndpoint(from: connection, name: name) {
                        if !(self?.discoveredEndpoints.contains(where: { $0.host == endpoint.host && $0.port == endpoint.port }) ?? true) {
                            self?.discoveredEndpoints.append(endpoint)
                        }
                    }
                    connection.cancel()
                }
            }
        }
        connection.start(queue: .main)
    }

    private func buildEndpoint(from connection: NWConnection, name: String) -> GatewayEndpoint? {
        guard let path = connection.currentPath,
              let remoteEndpoint = path.remoteEndpoint else {
            return nil
        }

        var host: String?
        var port: Int?

        if case .hostPort(let h, let p) = remoteEndpoint {
            switch h {
            case .ipv4(let addr):
                host = "\(addr)"
            case .ipv6(let addr):
                host = "\(addr)"
            case .name(let hostname, _):
                host = hostname
            @unknown default:
                break
            }
            port = Int(p.rawValue)
        }

        guard let resolvedHost = host, let resolvedPort = port else {
            return nil
        }

        return GatewayEndpoint.fromBonjour(
            name: name,
            host: resolvedHost,
            port: resolvedPort
        )
    }

    // MARK: - Manual Add

    func addManualEndpoint(host: String, port: Int, name: String, useTLS: Bool = false) {
        let endpoint = GatewayEndpoint(
            name: name.isEmpty ? "\(host):\(port)" : name,
            host: host,
            port: port,
            useTLS: useTLS
        )

        if !discoveredEndpoints.contains(where: { $0.host == host && $0.port == port }) {
            discoveredEndpoints.append(endpoint)
        }
    }

    // MARK: - Remove Endpoint

    func removeEndpoint(_ endpoint: GatewayEndpoint) {
        discoveredEndpoints.removeAll { $0.id == endpoint.id }
    }

    // MARK: - Refresh

    func refresh() {
        stopDiscovery()
        startDiscovery()
    }
}
