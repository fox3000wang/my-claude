import Foundation
import os.log

/// Centralized logging utility for MyClaw.
///
/// Uses OSLog for structured logging with categories and log levels.
/// In DEBUG builds, logs are written to stdout (visible in Xcode console).
/// In RELEASE builds, logs are written to the system log with appropriate privacy.
///
/// Usage:
///   Logger.shared.debug("Connected to gateway")
///   Logger.shared.info("Pairing initiated")
///   Logger.shared.error("Connection failed: \(error)")
///
final class Logger {
    static let shared = Logger()

    private let subsystem = Constants.App.bundleId
    private let osLog: OSLog
    private let dateFormatter: DateFormatter
    private let isEnabled: Bool

    // MARK: - Log Categories

    enum Category: String {
        case app = "App"
        case network = "Network"
        case crypto = "Crypto"
        case pairing = "Pairing"
        case discovery = "Discovery"
        case canvas = "Canvas"
        case capabilities = "Capabilities"
        case ui = "UI"
    }

    private init() {
        osLog = OSLog(subsystem: subsystem, category: "MyClaw")
        isEnabled = true

        dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
    }

    // MARK: - Log Levels

    enum Level: String {
        case debug = "DEBUG"
        case info = "INFO"
        case warning = "WARNING"
        case error = "ERROR"
    }

    // MARK: - Public API

    func debug(_ message: String, category: Category = .app) {
        log(level: .debug, message: message, category: category)
    }

    func info(_ message: String, category: Category = .app) {
        log(level: .info, message: message, category: category)
    }

    func warning(_ message: String, category: Category = .app) {
        log(level: .warning, message: message, category: category)
    }

    func error(_ message: String, category: Category = .app) {
        log(level: .error, message: message, category: category)
    }

    func error(_ error: Error, context: String? = nil, category: Category = .app) {
        let message = context != nil ? "\(context!): \(error.localizedDescription)" : error.localizedDescription
        log(level: .error, message: message, category: category)
    }

    // MARK: - Private Logging

    private func log(level: Level, message: String, category: Category) {
        guard isEnabled else { return }

        let timestamp = dateFormatter.string(from: Date())
        let formattedMessage = "[\(timestamp)] [\(category.rawValue)] [\(level.rawValue)] \(message)"

        #if DEBUG
        print(formattedMessage)
        #endif

        let osLogType: OSLogType
        switch level {
        case .debug: osLogType = .debug
        case .info: osLogType = .info
        case .warning: osLogType = .default
        case .error: osLogType = .error
        }

        os_log("%{public}@", log: OSLog(subsystem: subsystem, category: category.rawValue), type: osLogType, message)
    }

    // MARK: - Convenience for Network Events

    func logConnectionAttempt(host: String, port: Int) {
        info("Connecting to \(host):\(port)", category: .network)
    }

    func logConnectionSuccess(host: String, port: Int) {
        info("Connected to \(host):\(port)", category: .network)
    }

    func logConnectionFailure(host: String, port: Int, error: Error) {
        self.error("Connection failed to \(host):\(port): \(error.localizedDescription)", category: .network)
    }

    func logDisconnection(reason: String) {
        info("Disconnected: \(reason)", category: .network)
    }

    // MARK: - Convenience for Crypto Events

    func logKeyGeneration() {
        debug("Generating new Ed25519 key pair", category: .crypto)
    }

    func logSignature(success: Bool) {
        if success {
            debug("Signature created successfully", category: .crypto)
        } else {
            warning("Signature creation failed", category: .crypto)
        }
    }

    // MARK: - Convenience for Pairing Events

    func logPairingRequest(endpoint: String) {
        info("Pairing request sent to \(endpoint)", category: .pairing)
    }

    func logPairingApproved(endpoint: String) {
        info("Pairing approved by \(endpoint)", category: .pairing)
    }

    func logPairingRejected(endpoint: String, reason: String?) {
        if let reason = reason {
            warning("Pairing rejected by \(endpoint): \(reason)", category: .pairing)
        } else {
            warning("Pairing rejected by \(endpoint)", category: .pairing)
        }
    }

    // MARK: - Convenience for Discovery Events

    func logDiscoveryStarted() {
        debug("Bonjour discovery started", category: .discovery)
    }

    func logDiscoveryStopped() {
        debug("Bonjour discovery stopped", category: .discovery)
    }

    func logGatewayFound(name: String, host: String, port: Int) {
        debug("Gateway discovered: \(name) at \(host):\(port)", category: .discovery)
    }

    func logGatewayLost(name: String) {
        debug("Gateway lost: \(name)", category: .discovery)
    }
}

// MARK: - Global Logging Helpers

/// Global function for quick logging without importing the singleton.
/// Usage: `log("message")` or `log(.error, "failed")`
func log(
    _ message: String,
    level: Logger.Level = .info,
    category: Logger.Category = .app
) {
    switch level {
    case .debug: Logger.shared.debug(message, category: category)
    case .info: Logger.shared.info(message, category: category)
    case .warning: Logger.shared.warning(message, category: category)
    case .error: Logger.shared.error(message, category: category)
    }
}
