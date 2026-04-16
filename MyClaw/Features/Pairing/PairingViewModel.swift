import Foundation
import Combine
import UIKit

@MainActor
final class PairingViewModel: ObservableObject {
    // MARK: - Published State

    @Published var pairingState: PairingServiceState = .unpaired
    @Published var pairingCode: String?
    @Published var pairingURL: String?
    @Published var errorMessage: String?
    @Published var deviceName: String = ""
    @Published var isLoading = false

    // MARK: - Private

    private let pairingService: PairingService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init(pairingService: PairingService? = nil) {
        self.pairingService = pairingService ?? PairingService.shared
        self.deviceName = UIDevice.current.name
        setupBindings()
    }

    private func setupBindings() {
        pairingService.$pairingState
            .receive(on: DispatchQueue.main)
            .assign(to: &$pairingState)

        pairingService.$pairingCode
            .receive(on: DispatchQueue.main)
            .assign(to: &$pairingCode)

        pairingService.$pairingURL
            .receive(on: DispatchQueue.main)
            .assign(to: &$pairingURL)

        pairingService.$lastError
            .receive(on: DispatchQueue.main)
            .compactMap { $0?.localizedDescription }
            .assign(to: &$errorMessage)
    }

    // MARK: - Actions

    func startPairing(with endpoint: GatewayEndpoint) async {
        isLoading = true
        errorMessage = nil

        do {
            _ = try await pairingService.initiatePairing(with: endpoint)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func approvePairing(with code: String) async {
        isLoading = true
        errorMessage = nil

        do {
            try await pairingService.approvePairing(code: code)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func rejectPairing(reason: String = "Rejected by user") {
        pairingService.rejectPairing(reason: reason)
    }

    func cancelPairing() {
        pairingService.cancelPairing()
    }

    func disposePairing() {
        pairingService.disposePairing()
    }

    func resetPairing() {
        do {
            try pairingService.resetPairing()
            pairingState = .unpaired
            pairingCode = nil
            pairingURL = nil
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Computed

    var canRetry: Bool {
        switch pairingState {
        case .unpaired, .rejected, .error:
            return true
        case .waitingForApproval, .approved:
            return false
        }
    }

    var canCancel: Bool {
        pairingState == .waitingForApproval
    }

    var statusTitle: String {
        switch pairingState {
        case .unpaired:
            return "Ready to Pair"
        case .waitingForApproval:
            return "Waiting for Approval"
        case .approved:
            return "Approved!"
        case .rejected:
            return "Pairing Failed"
        case .error(let message):
            return "Error: \(message)"
        }
    }

    var statusSubtitle: String {
        switch pairingState {
        case .unpaired:
            return "Select a Gateway to begin pairing"
        case .waitingForApproval:
            return "Approve this device on the Gateway"
        case .approved:
            return "Device has been approved successfully"
        case .rejected(let reason):
            return reason
        case .error(let message):
            return message
        }
    }

    var iconName: String {
        switch pairingState {
        case .unpaired:
            return "link"
        case .waitingForApproval:
            return "link.badge.plus"
        case .approved:
            return "checkmark.link"
        case .rejected:
            return "xmark.link"
        case .error:
            return "exclamationmark.link"
        }
    }

    var iconColor: String {
        switch pairingState {
        case .unpaired:
            return "blue"
        case .waitingForApproval:
            return "orange"
        case .approved:
            return "green"
        case .rejected, .error:
            return "red"
        }
    }
}
