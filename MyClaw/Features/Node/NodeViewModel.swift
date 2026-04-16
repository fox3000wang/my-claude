import Foundation
import Combine

@MainActor
final class NodeViewModel: ObservableObject {
    @Published var capabilities: [Capability] = Capability.defaultCapabilities
    @Published var status: NodeStatus = .disconnected

    private let nodeSession = NodeSession.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        loadCapabilities()
        setupBindings()
    }

    private func setupBindings() {
        nodeSession.$capabilities
            .receive(on: DispatchQueue.main)
            .sink { [weak self] caps in
                if caps != self?.capabilities {
                    self?.capabilities = caps
                }
            }
            .store(in: &cancellables)

        nodeSession.$status
            .receive(on: DispatchQueue.main)
            .assign(to: &$status)
    }

    private func loadCapabilities() {
        nodeSession.loadCapabilities()
        capabilities = nodeSession.capabilities
    }

    func toggleCapability(_ capability: Capability) {
        if capability.isEnabled {
            nodeSession.disableCapability(capability.id)
        } else {
            nodeSession.enableCapability(capability.id)
        }
        if let index = capabilities.firstIndex(where: { $0.id == capability.id }) {
            capabilities[index].isEnabled.toggle()
        }
    }

    var enabledCount: Int {
        capabilities.filter { $0.isEnabled }.count
    }

    var deviceId: String {
        nodeSession.deviceId
    }
}
