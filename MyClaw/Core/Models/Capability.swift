import Foundation

/// Represents a capability that the node exposes to the Gateway.
struct Capability: Identifiable, Equatable {
    let id: String
    var isEnabled: Bool
    var lastUsed: Date?

    init(id: String, isEnabled: Bool = true, lastUsed: Date? = nil) {
        self.id = id
        self.isEnabled = isEnabled
        self.lastUsed = lastUsed
    }

    static let allCapabilityIDs = [
        "camera", "canvas", "screen", "location", "voice"
    ]

    static let defaultCapabilities: [Capability] = [
        Capability(id: "canvas", isEnabled: true),
        Capability(id: "camera", isEnabled: false),
        Capability(id: "screen", isEnabled: false),
        Capability(id: "location", isEnabled: false),
        Capability(id: "voice", isEnabled: false),
    ]

    var displayName: String {
        switch id {
        case "camera": return "Camera"
        case "canvas": return "Canvas"
        case "screen": return "Screen"
        case "location": return "Location"
        case "voice": return "Voice"
        default: return id.capitalized
        }
    }

    var commands: [String] {
        switch id {
        case "canvas":
            return ["canvas.navigate", "canvas.eval", "canvas.snapshot"]
        case "camera":
            return ["camera.capture"]
        case "screen":
            return ["screen.record"]
        case "location":
            return ["location.get"]
        case "voice":
            return ["voicewake"]
        default:
            return []
        }
    }
}
