# MyClaw iOS — Development Plan

**版本:** 1.0.0  
**日期:** 2026-04-15  
**基于:** SPEC.md v0.1.0

---

## 1. 项目结构

### 1.1 目录结构

```
MyClaw/
├── App/
│   ├── MyClawApp.swift              # @main 入口
│   └── AppDelegate.swift            # 生命周期 + 推送
├── Core/
│   ├── Models/                      # 数据模型
│   │   ├── GatewayEndpoint.swift
│   │   ├── NodeStatus.swift
│   │   ├── Capability.swift
│   │   ├── PairingInfo.swift
│   │   └── GatewayMessage.swift     # WebSocket 消息类型
│   ├── Services/
│   │   ├── GatewayClient.swift      # WebSocket 核心客户端
│   │   ├── PairingService.swift     # 配对流程
│   │   ├── DiscoveryService.swift  # Bonjour 发现
│   │   ├── CryptoService.swift      # Ed25519 签名/验签
│   │   └── KeychainService.swift    # Keychain 封装
│   ├── Node/
│   │   ├── NodeSession.swift        # 节点会话管理
│   │   └── Capabilities/
│   │       ├── CanvasCapability.swift
│   │       ├── CameraCapability.swift
│   │       ├── ScreenCapability.swift
│   │       └── LocationCapability.swift
│   └── Utilities/
│       ├── Constants.swift
│       └── Extensions.swift
├── Features/
│   ├── Home/
│   │   ├── HomeView.swift
│   │   └── HomeViewModel.swift
│   ├── Node/
│   │   ├── NodeView.swift
│   │   └── NodeViewModel.swift
│   ├── Settings/
│   │   ├── SettingsView.swift
│   │   └── SettingsViewModel.swift
│   ├── Discovery/
│   │   ├── DiscoveryView.swift
│   │   └── DiscoveryViewModel.swift
│   ├── Pairing/
│   │   ├── PairingView.swift
│   │   └── PairingViewModel.swift
│   └── Canvas/
│       ├── CanvasView.swift         # UIKit (WKWebView)
│       ├── CanvasViewController.swift
│       └── CanvasViewModel.swift
├── Resources/
│   ├── Assets.xcassets/
│   ├── Localizable.strings
│   └── Info.plist
└── Tests/
    ├── Unit/
    │   ├── CryptoServiceTests.swift
    │   ├── GatewayClientTests.swift
    │   └── KeychainServiceTests.swift
    └── UI/
        └── MyClawUITests.swift
```

---

## 2. 依赖管理 (Swift Package Manager)

### 2.1 Package.swift / project.yml 配置

```yaml
dependencies:
  - package: Starscream
    url: https://github.com/daltoniam/Starscream
    from: "4.0.0"
  - package: KeychainAccess
    url: https://github.com/kishikawakatsumi/KeychainAccess
    from: "4.2.0"
```

### 2.2 依赖说明

| 库 | 版本 | 用途 |
|----|------|------|
| **Starscream** | 4.0+ | WebSocket 客户端，比 URLSession WebSocket 更成熟，支持 ping/pong、重连、超时配置 |
| **KeychainAccess** | 4.2+ | Keychain 封装，简化 Token/私钥存储 |
| **CryptoKit** | 内置 | Ed25519 签名 (iOS 13+) |

---

## 3. 架构决策

### 3.1 整体架构：MVVM + Services

```
┌─────────────────────────────────────────────┐
│                    View                      │
│  (SwiftUI Views + UIKit CanvasViewController)│
└──────────────────┬──────────────────────────┘
                   │ @StateObject / @ObservedObject
┌──────────────────▼──────────────────────────┐
│                ViewModel                      │
│  (HomeViewModel, NodeViewModel, etc.)         │
└──────────────────┬──────────────────────────┘
                   │ async/await
┌──────────────────▼──────────────────────────┐
│                 Services                     │
│  GatewayClient, PairingService, CryptoService│
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Data Layer                      │
│  KeychainService, UserDefaults, Bonjour      │
└─────────────────────────────────────────────┘
```

### 3.2 SwiftUI + UIKit 集成点

**Canvas WebView (UIKit → SwiftUI 嵌入)**:

```swift
// CanvasView.swift — UIViewRepresentable 包装
import SwiftUI
import WebKit

struct CanvasView: UIViewRepresentable {
    @ObservedObject var viewModel: CanvasViewModel
    let canvasURL: URL?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let url = canvasURL {
            webView.load(URLRequest(url: url))
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(viewModel: viewModel)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        // 处理页面加载、JS 回调
    }
}
```

**调用方式**:
```swift
// HomeView 或任何 SwiftUI View 中
CanvasView(viewModel: canvasViewModel, canvasURL: $canvasURL)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
```

---

## 4. M1 — 基础框架 + WebSocket 连接

### 4.1 目标
可连接 Gateway 并完成握手。

### 4.2 任务清单

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 创建 Xcode 项目，配置 SPM | `project.yml` (XcodeGen) | — |
| 2 | 实现 `Constants.swift` | 常量定义 | — |
| 3 | 实现 `GatewayEndpoint.swift` | 数据模型 | — |
| 4 | 实现 `NodeStatus.swift` + `Capability.swift` | 数据模型 | — |
| 5 | 实现 `KeychainService.swift` | Keychain 读写 | KeychainAccess |
| 6 | 实现 `CryptoService.swift` | Ed25519 密钥对生成、签名 | CryptoKit |
| 7 | 实现 `GatewayMessage.swift` | WebSocket 消息结构体 | — |
| 8 | 实现 `GatewayClient.swift` | WebSocket 连接 + 握手 | Starscream, CryptoService |
| 9 | 实现 `NodeSession.swift` | 会话状态管理 | GatewayClient |
| 10 | 编写 M1 单元测试 | `GatewayClientTests.swift` | — |

### 4.3 关键实现细节

#### GatewayClient.swift

```swift
// 连接 + 握手流程
class GatewayClient: ObservableObject {
    @Published var status: NodeStatus = .disconnected
    private var socket: WebSocket?
    private var currentChallenge: ChallengePayload?

    // 1. 连接
    func connect(to endpoint: GatewayEndpoint) async throws

    // 2. 处理 challenge
    func handleChallenge(_ challenge: ChallengePayload) async throws -> ConnectRequest

    // 3. 发送 connect 请求
    func sendConnectRequest(_ request: ConnectRequest) async throws -> ConnectResponse

    // 4. 接收 hello-ok
    func receiveHello() async throws
}
```

#### 握手消息构建

```swift
// Challenge 响应签名 payload
struct SignablePayload {
    let nonce: String
    let timestamp: Int64
    let clientId: String
    let platform: String
}

// 签名
func sign(payload: SignablePayload) async throws -> Data {
    let jsonData = try JSONEncoder().encode(payload)
    let privateKey = try loadPrivateKey() // 从 Keychain
    let signature = try CryptoKit.Ed25519.signature(for: jsonData, using: privateKey)
    return signature
}
```

### 4.4 M1 测试要求

| 测试 | 描述 |
|------|------|
| `testConnectSuccess` | 模拟 Gateway 发送 challenge，验证签名正确 |
| `testInvalidSignature` | 模拟签名错误，验证拒绝 |
| `testReconnect` | 断线重连流程 |

---

## 5. M2 — 配对流程 + Token 管理

### 5.1 目标
完成配对-审批-存储全流程。

### 5.2 任务清单

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 实现 `PairingInfo.swift` | 数据模型 | — |
| 2 | 实现 `PairingService.swift` | 配对请求/响应处理 | GatewayClient |
| 3 | 实现 `PairingViewModel.swift` | 配对状态管理 | PairingService |
| 4 | 实现 `PairingView.swift` | 配对 UI | SwiftUI |
| 5 | 实现 Token 存储逻辑 | KeychainService | KeychainAccess |
| 6 | 实现设备 ID 生成/加载 | CryptoService | — |
| 7 | 实现 Gateway 发现 (Bonjour) | `DiscoveryService.swift` | — |
| 8 | 实现 `DiscoveryViewModel.swift` | 发现列表管理 | DiscoveryService |
| 9 | 实现 `DiscoveryView.swift` | 发现列表 UI | SwiftUI |
| 10 | 编写 M2 单元测试 | `PairingServiceTests.swift` | — |

### 5.3 配对流程

```
App                          Gateway
 │                              │
 │  ──── pairing.request ────►  │
 │                              │  (展示配对码，等待审批)
 │  ◄─── pairing.pending ─────  │
 │                              │
 │  ◄─── pairing.approved ────  │  (Gateway 管理员审批)
 │      { token: "..." }        │
 │                              │
 │  存储 token 到 Keychain      │
```

### 5.4 DiscoveryService (Bonjour)

```swift
class DiscoveryService: NSObject, ObservableObject {
    @Published var discoveredGateways: [GatewayEndpoint] = []

    private var serviceBrowser: NetServiceBrowser?
    private var services: [NetService] = []

    func startDiscovery()
    func stopDiscovery()

    // 解析服务
    func resolveService(_ service: NetService) -> GatewayEndpoint?
}

// Bonjour service type: "_openclaw-gw._tcp."
```

### 5.5 M2 测试要求

| 测试 | 描述 |
|------|------|
| `testPairingRequest` | 验证 pairing.request 消息格式 |
| `testTokenStorage` | 验证 Token 正确存储到 Keychain |
| `testDeviceIdPersistence` | 验证设备 ID 跨会话持久化 |

---

## 6. M3 — Canvas 能力

### 6.1 目标
WKWebView + `canvas.navigate` + `canvas.eval` + `canvas.snapshot`。

### 6.2 任务清单

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 实现 `CanvasViewModel.swift` | Canvas 状态管理 | — |
| 2 | 实现 `CanvasViewController.swift` | UIKit WKWebView Controller | UIKit, WebKit |
| 3 | 实现 `CanvasView.swift` | UIViewRepresentable 包装 | SwiftUI |
| 4 | 实现 `CanvasCapability.swift` | 处理 Gateway 命令 | GatewayClient |
| 5 | 实现 `canvas.navigate` 处理 | 加载 URL | WKWebView |
| 6 | 实现 `canvas.eval` 处理 | 执行 JS | WKWebView |
| 7 | 实现 `canvas.snapshot` 处理 | 截图 | WKWebView |
| 8 | 实现 `HomeViewModel` 快捷打开 Canvas | — | — |
| 9 | 编写 M3 单元测试 | `CanvasViewModelTests.swift` | — |

### 6.3 Canvas WebView 集成

```swift
// CanvasViewController.swift
class CanvasViewController: UIViewController {
    private lazy var webView: WKWebView = {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.allowsInlineMediaPlayback = true
        return WKWebView(frame: .zero, configuration: config)
    }()

    // canvas.navigate
    func navigate(to url: URL) {
        webView.load(URLRequest(url: url))
    }

    // canvas.eval
    func evaluateJavaScript(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
    }

    // canvas.snapshot
    func snapshot() async throws -> UIImage {
        let config = WKSnapshotConfiguration()
        // 截图逻辑
    }
}
```

### 6.4 Gateway 命令处理

```swift
// GatewayClient 中的命令分发
enum GatewayCommand {
    case canvasNavigate(url: URL)
    case canvasEval(script: String)
    case canvasSnapshot
    // ...
}

extension GatewayClient {
    func handleCommand(_ message: GatewayMessage) async throws -> GatewayResponse {
        switch message.method {
        case "canvas.navigate":
            return try await canvasCapability.navigate(params: message.params)
        case "canvas.eval":
            return try await canvasCapability.eval(params: message.params)
        case "canvas.snapshot":
            return try await canvasCapability.snapshot()
        default:
            throw GatewayError.unknownCommand
        }
    }
}
```

### 6.5 M3 测试要求

| 测试 | 描述 |
|------|------|
| `testCanvasNavigate` | 验证 URL 加载 |
| `testCanvasEval` | 验证 JS 执行 |
| `testCanvasSnapshot` | 验证截图生成 |

---

## 7. M4 — 其余 Node 能力

### 7.1 目标
Camera/Location/Screen 能力。

### 7.2 任务清单

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 实现 `CameraCapability.swift` | 拍照能力 | AVFoundation |
| 2 | 实现 `ScreenCapability.swift` | 屏幕录制能力 | ReplayKit |
| 3 | 实现 `LocationCapability.swift` | 定位能力 | CoreLocation |
| 4 | 实现 `NodeViewModel` | 能力总览状态 | Capabilities |
| 5 | 实现 `NodeView.swift` | 能力管理 UI | SwiftUI |
| 6 | 实现 `HomeView.swift` | 主界面 UI | SwiftUI |
| 7 | 实现 `SettingsView.swift` | 设置页 UI | SwiftUI |
| 8 | 编写 M4 单元测试 | `CapabilityTests.swift` | — |

### 7.3 能力接口定义

```swift
protocol NodeCapability {
    var id: String { get }
    var isEnabled: Bool { get set }
    func handleCommand(_ command: String, params: [String: Any]?) async throws -> Any?
}

// 各能力实现
class CameraCapability: NodeCapability { ... }
class ScreenCapability: NodeCapability { ... }
class LocationCapability: NodeCapability { ... }
```

### 7.4 M4 测试要求

| 测试 | 描述 |
|------|------|
| `testCameraCapture` | 验证拍照输出 |
| `testLocationGet` | 验证定位返回 |
| `testScreenRecord` | 验证屏幕录制启动/停止 |

---

## 8. M5 — UI 完善 + 错误处理

### 8.1 目标
完整的 Settings + 错误提示。

### 8.2 任务清单

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 实现 `SettingsViewModel.swift` | 设置逻辑 | — |
| 2 | 实现 Gateway 配置编辑 | SettingsView | SwiftUI |
| 3 | 实现手动/自动发现切换 | SettingsView | — |
| 4 | 实现清除配对/重置 | SettingsView | KeychainService |
| 5 | 实现连接状态卡片 | HomeView | — |
| 6 | 实现错误提示组件 | `ErrorBanner.swift` | SwiftUI |
| 7 | 实现 NodeView 状态显示 | NodeView | — |
| 8 | 实现脱敏/多 Gateway 支持 | SettingsView | — |
| 9 | 实现 About 页面 | SettingsView | — |
| 10 | 编写 M5 UI 测试 | `MyClawUITests.swift` | XCUITest |

### 8.3 错误处理

```swift
enum GatewayError: LocalizedError {
    case nodeBackgroundUnavailable
    case hostNotConfigured
    case pairingFailed(reason: String)
    case connectionFailed
    case invalidSignature
    case tokenExpired
    case unknownCommand

    var errorDescription: String? {
        switch self {
        case .nodeBackgroundUnavailable:
            return "Please bring the app to foreground"
        // ...
        }
    }
}
```

### 8.4 M5 测试要求

| 测试 | 描述 |
|------|------|
| `testPairingReset` | 清除配对后重置状态 |
| `testErrorBannerDisplay` | 验证错误提示显示 |
| `testSettingsPersistence` | 验证设置持久化 |

---

## 9. M6 — 测试 + 优化

### 9.1 目标
单元/UI 测试，性能优化。

### 9.2 任务清单

| # | 任务 | 文件 | 依赖 |
|---|------|------|------|
| 1 | 完善 `CryptoServiceTests.swift` | 签名验签测试 | — |
| 2 | 完善 `GatewayClientTests.swift` | 消息序列化测试 | — |
| 3 | 完善 `KeychainServiceTests.swift` | 存储测试 | — |
| 4 | 添加 UI 测试 | `MyClawUITests.swift` | XCUITest |
| 5 | 添加集成测试 (WebSocket mock) | `GatewayClientIntegrationTests.swift` | — |
| 6 | 性能优化：连接速度 | GatewayClient | — |
| 7 | 电池优化：后台网络 | AppDelegate (background) | — |
| 8 | 辅助功能审核 | VoiceOver | Accessibility |
| 9 | 构建验证 | Xcode Build | — |
| 10 | TestFlight 打包准备 | — | — |

### 9.3 M6 测试要求

| 测试 | 描述 |
|------|------|
| `testFullPairingFlow` | 完整配对到连接流程 |
| `testCommandRoundTrip` | 命令发送→接收→响应 |
| `testMemoryLeaks` | Instruments Leaks |
| `testBackgroundBehavior` | 后台存活测试 |

---

## 10. WebSocket 协议实现细节

### 10.1 消息格式

```swift
// GatewayMessage.swift
struct GatewayMessage: Codable {
    let type: MessageType  // "req", "res", "event"
    let id: String?         // 请求 ID (type=req 时)
    let method: String?     // 方法名 (type=req 时)
    let event: String?      // 事件名 (type=event 时)
    let params: [String: AnyCodable]?
    let payload: AnyCodable?
}

enum MessageType: String, Codable {
    case req, res, event
}
```

### 10.2 请求/响应处理

```swift
class GatewayClient {
    private var pendingRequests: [String: CheckedContinuation<GatewayMessage, Error>] = [:]

    func sendRequest<T: Decodable>(
        method: String,
        params: [String: Any]?
    ) async throws -> T {
        let id = UUID().uuidString
        let message = GatewayMessage(
            type: .req,
            id: id,
            method: method,
            params: params?.mapValues { AnyCodable($0) }
        )
        try await send(message)

        return try await withCheckedThrowingContinuation { continuation in
            pendingRequests[id] = continuation
        }
    }

    func handleResponse(_ message: GatewayMessage) {
        guard let id = message.id,
              let continuation = pendingRequests.removeValue(forKey: id) else {
            return
        }
        continuation.resume(returning: message)
    }
}
```

### 10.3 事件处理

```swift
class GatewayClient {
    @Published var nodeEvents: [NodeEvent] = []

    func handleEvent(_ message: GatewayMessage) {
        guard let event = message.event else { return }

        switch event {
        case "node.event":
            let payload = message.payload?.value as? [String: Any]
            let nodeEvent = NodeEvent(from: payload)
            nodeEvents.append(nodeEvent)
        // 其他事件...
        }
    }
}
```

---

## 11. 文件清单与职责

| 文件 | 职责 | Milestone |
|------|------|-----------|
| `MyClawApp.swift` | App 入口，@main | M1 |
| `AppDelegate.swift` | 生命周期，后台任务 | M1 |
| `GatewayEndpoint.swift` | Gateway 端点模型 | M1 |
| `NodeStatus.swift` | 连接状态枚举 | M1 |
| `Capability.swift` | 节点能力模型 | M1 |
| `PairingInfo.swift` | 配对信息模型 | M2 |
| `GatewayMessage.swift` | WebSocket 消息结构 | M1 |
| `KeychainService.swift` | Keychain 封装 | M1 |
| `CryptoService.swift` | Ed25519 加密/签名 | M1 |
| `GatewayClient.swift` | WebSocket 核心客户端 | M1 |
| `NodeSession.swift` | 节点会话管理 | M1 |
| `PairingService.swift` | 配对流程服务 | M2 |
| `DiscoveryService.swift` | Bonjour 发现服务 | M2 |
| `CanvasCapability.swift` | Canvas 能力处理 | M3 |
| `CameraCapability.swift` | 拍照能力 | M4 |
| `ScreenCapability.swift` | 屏幕录制能力 | M4 |
| `LocationCapability.swift` | 定位能力 | M4 |
| `HomeViewModel.swift` | Home 业务逻辑 | M4 |
| `HomeView.swift` | 主界面 | M4 |
| `NodeViewModel.swift` | Node 业务逻辑 | M4 |
| `NodeView.swift` | 节点能力管理 | M4 |
| `SettingsViewModel.swift` | Settings 业务逻辑 | M5 |
| `SettingsView.swift` | 设置页 | M5 |
| `DiscoveryViewModel.swift` | 发现列表逻辑 | M2 |
| `DiscoveryView.swift` | 发现列表页 | M2 |
| `PairingViewModel.swift` | 配对逻辑 | M2 |
| `PairingView.swift` | 配对页 | M2 |
| `CanvasViewModel.swift` | Canvas 业务逻辑 | M3 |
| `CanvasViewController.swift` | UIKit WebView | M3 |
| `CanvasView.swift` | SwiftUI 包装 | M3 |
| `ErrorBanner.swift` | 错误提示组件 | M5 |
| `Constants.swift` | 常量定义 | M1 |
| `Extensions.swift` | 扩展工具 | M1 |

---

## 12. 测试文件清单

| 文件 | 描述 | Milestone |
|------|------|-----------|
| `CryptoServiceTests.swift` | 签名/验签测试 | M1 |
| `KeychainServiceTests.swift` | Keychain 读写测试 | M1 |
| `GatewayClientTests.swift` | WebSocket 消息测试 | M1 |
| `PairingServiceTests.swift` | 配对流程测试 | M2 |
| `CanvasViewModelTests.swift` | Canvas 逻辑测试 | M3 |
| `CapabilityTests.swift` | 各能力测试 | M4 |
| `MyClawUITests.swift` | UI 集成测试 | M5 |
| `GatewayClientIntegrationTests.swift` | WebSocket mock 测试 | M6 |

---

## 13. 实施顺序

```
M1 (1-2周)
  └── 基础框架 + WebSocket 连接
      ├── 项目初始化 (XcodeGen)
      ├── 数据模型
      ├── KeychainService + CryptoService
      └── GatewayClient (连接 + 握手)

M2 (1-2周)
  └── 配对流程 + Token 管理
      ├── PairingService + PairingView
      ├── DiscoveryService + DiscoveryView
      └── Token 持久化

M3 (2-3周)
  └── Canvas 能力
      ├── CanvasViewController (UIKit)
      ├── CanvasView (SwiftUI)
      ├── canvas.navigate / eval / snapshot
      └── HomeViewModel 集成

M4 (2-3周)
  └── 其余 Node 能力
      ├── Camera / Screen / Location Capability
      ├── NodeView + HomeView
      └── SettingsView 基础

M5 (1-2周)
  └── UI 完善 + 错误处理
      ├── SettingsView 完整
      ├── 错误提示
      └── NodeView 完善

M6 (1-2周)
  └── 测试 + 优化
      ├── 单元测试完善
      ├── UI 测试
      └── 性能/电池优化
```

---

## 14. 注意事项

1. **线程安全**: WebSocket 回调在后台线程，必须用 `@MainActor` 更新 UI
2. **后台模式**: App 在后台时 WebSocket 应保持连接（需配置 `backgroundModes`）
3. **Keychain 访问**: 私钥存储使用 `kSecAttrAccessibleAfterFirstUnlock`
4. **Bonjur 权限**: `NSLocalNetworkUsageDescription` 需要在 Info.plist 声明
5. **相机/定位权限**: `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`
6. **屏幕录制**: 需要 `NSScreenCaptureUsageDescription` (iOS 16+)
