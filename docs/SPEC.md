# MyClaw iOS 客户端 — 需求文档

**版本:** v0.1.0 (草稿)
**作者:** Fox & 虾妹妹
**日期:** 2026-04-15

---

## 1. 项目概述

### 项目名称
- **MyClaw** — OpenClaw iOS 客户端

### 核心定位
一款 iOS 应用，作为 OpenClaw Gateway 的移动端节点（node），将设备能力（摄像头、屏幕、Canvas、定位、语音）暴露给 Gateway，同时支持远程连接和控制。

### 关键约束
- iOS 14.0+ (可选 iOS 16+ 以使用某些新特性)
- SwiftUI + UIKit 混合架构（Canvas WebView 需要 UIKit）
- WatchConnectivity 用于 Apple Watch 配对（可选 v2）

---

## 2. 技术架构

### 整体架构
```
┌─────────────────────────────────────────────────────────┐
│                    iOS App (MyClaw)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  SwiftUI    │  │   UIKit     │  │   WebSocket    │ │
│  │  Views      │  │  (Canvas)   │  │   GatewayClient │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                          │                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Services   │  │   Node      │  │   Crypto        │ │
│  │  (Pairing,  │  │  Capabilities│  │   (KeyPair,    │ │
│  │   Discovery)│  │             │  │    Signing)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │ WebSocket
                            ▼
┌─────────────────────────────────────────────────────────┐
│              OpenClaw Gateway (远程/局域网)              │
│                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│   │ Operator │  │  Node    │  │  Capability Broker   │ │
│   │ Sessions │  │ Registry │  │  (camera/screen/etc.) │ │
│   └──────────┘  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 技术栈
| 层级 | 技术选型 |
|------|---------|
| UI | SwiftUI (主) + UIKit (WebView Canvas) |
| 网络 | URLSession WebSocket (原生) |
| 安全 | CryptoKit (签名/验签, Ed25519) |
| 本地存储 | Keychain (Token) + UserDefaults (偏好设置) |
| 发现服务 | Bonjour (NSNetService) |
| 并发 | Swift Concurrency (async/await) |
| 依赖管理 | Swift Package Manager |

### 关键依赖（预估）
- **Starscream** — WebSocket 客户端（更成熟的 WebSocket 库）
- **KeychainAccess** — Keychain 封装
- **CryptoKit** — 内置，无需额外依赖

---

## 3. 功能需求

### 3.1 Gateway 连接管理

#### 发现与连接
| 功能 | 描述 | 优先级 |
|------|------|--------|
| Bonjour 自动发现 | 发现局域网内的 `_openclaw-gw._tcp` 服务 | P0 |
| 手动输入 | Host + Port 手动连接 | P0 |
| Tailscale 远程 | 通过 MagicDNS 连接远程 Gateway | P1 |
| 连接状态 | 显示连接/断开/重连状态 | P0 |

#### 认证与配对
| 功能 | 描述 | 优先级 |
|------|------|--------|
| Token 存储 | 配对后存储 DeviceToken 到 Keychain | P0 |
| 自动重连 | 网络恢复后自动重连 | P1 |
| 配对流程 | 发起配对请求 → Gateway 审批 | P0 |
| 多 Gateway | 支持配置多个 Gateway | P2 |

### 3.2 节点能力 (Node Capabilities)

iOS 设备作为节点，注册以下能力到 Gateway：

| 能力 | 命令 | 描述 | 优先级 |
|------|------|------|--------|
| Canvas | `canvas.navigate` | WKWebView 加载 Canvas URL | P0 |
| Canvas | `canvas.eval` | 在 Canvas 上执行 JS | P1 |
| Canvas | `canvas.snapshot` | 截图 | P1 |
| Camera | `camera.capture` | 拍照 | P2 |
| Screen | `screen.record` | 屏幕录制 | P2 |
| Location | `location.get` | 获取定位 | P2 |
| Voice | `voicewake` | 语音唤醒 | P2 |

### 3.3 用户界面

#### 屏幕结构
```
App
├── ContentView (TabView)
│   ├── Tab 1: HomeView (连接状态 + 快捷操作)
│   ├── Tab 2: NodeView (节点能力管理)
│   └── Tab 3: SettingsView (Gateway 设置)
├── PairingView (配对流程)
├── DiscoveryView (Gateway 发现列表)
└── CanvasView (UIKit/WKWebView, 模态)
```

#### HomeView
- 当前 Gateway 连接状态卡片
- 节点在线/离线状态
- 快速操作：打开 Canvas、测试连接

#### NodeView
- 能力开关（Camera/Screen/Location/Voice）
- 各能力的最后使用时间
- 实时状态

#### SettingsView
- Gateway 配置（IP/端口）
- 手动/自动发现切换
- 清除配对/重置
- 关于

### 3.4 错误处理

| 错误码 | 处理 |
|--------|------|
| `NODE_BACKGROUND_UNAVAILABLE` | 提示用户将 App 切回前台 |
| `A2UI_HOST_NOT_CONFIGURED` | Gateway 未配置 Canvas Host，检查 Gateway 设置 |
| 配对失败 | 显示错误原因，引导重新配对 |
| 连接断开 | 自动重连（最多 3 次），之后提示用户 |

---

## 4. 通信协议（Gateway Protocol v3）

### 4.1 WebSocket 连接

**Endpoint**: `ws://<gateway-host>:<port>` 或 `wss://` (TLS)

### 4.2 握手流程

```
1. Gateway 发送 challenge:
   {"type":"event","event":"connect.challenge","payload":{"nonce":"...","ts":...}}

2. Client 回复 connect:
   {"type":"req","id":"...","method":"connect","params":{
     "minProtocol":3,"maxProtocol":3,
     "client":{"id":"myclaw-ios","version":"0.1.0","platform":"ios","mode":"node"},
     "role":"node",
     "scopes":[],
     "caps":["camera","canvas","screen","location","voice"],
     "commands":["camera.capture","canvas.navigate","canvas.eval","canvas.snapshot","screen.record","location.get"],
     "permissions":{"camera.capture":true,"screen.record":false},
     "auth":{"token":"<pairing-token>"},
     "device":{"id":"<device-id>","publicKey":"...","signature":"...","signedAt":...,"nonce":"..."}
   }}

3. Gateway 回复:
   {"type":"res","id":"...","ok":true,"payload":{"type":"hello-ok","protocol":3,...}}
```

### 4.3 Node .invoke 示例

收到 Gateway 命令后回复：
```json
{"type":"res","id":"invoke-123","ok":true,"payload":{"result":"..."}}
```

### 4.4 事件上报

iOS → Gateway 上报事件：
```json
{"type":"event","event":"node.event","payload":{"nodeEvent":"...","data":{}}}
```

---

## 5. 数据模型

### 5.1 GatewayEndpoint
```swift
struct GatewayEndpoint: Codable, Identifiable {
    let id: UUID
    var name: String           // 可读名称
    var host: String            // IP 或域名
    var port: Int               // 默认 18789
    var useTLS: Bool
    var lastConnected: Date?
}
```

### 5.2 NodeStatus
```swift
enum NodeStatus: String {
    case disconnected
    case connecting
    case paired
    case connected
    case error
}
```

### 5.3 Capability
```swift
struct Capability: Identifiable {
    let id: String              // "camera", "canvas", etc.
    var isEnabled: Bool
    var lastUsed: Date?
}
```

### 5.4 PairingInfo
```swift
struct PairingInfo: Codable {
    let deviceId: String        // 设备指纹 (KeyPair hash)
    let deviceToken: String      // Gateway 颁发的 token
    let gatewayEndpointId: UUID
    let pairedAt: Date
}
```

---

## 6. 安全设计

### 6.1 设备身份
- 使用 **Ed25519** 密钥对
- 设备 ID = 公钥指纹 (SHA256)
- 首次启动时在 Keychain 中生成并存储

### 6.2 签名流程
1. 收到 Gateway 的 `connect.challenge` nonce
2. 构建签名 payload (包含 nonce + timestamp + client info)
3. 用私钥签名
4. 在 `connect` 请求中发送公钥 + 签名 + nonce

### 6.3 Token 存储
- **Keychain** 存储 `deviceToken`、`privateKey`
- **UserDefaults** 存储公开配置（不含敏感信息）

---

## 7. 非功能需求

| 需求 | 指标 |
|------|------|
| 响应速度 | 握手完成 < 2s（局域网） |
| 电池 | 后台运行时最小化网络活动 |
| 离线支持 | 断网时优雅降级，不闪退 |
| 辅助功能 | 支持 VoiceOver |
| 国际化 | 英文为主，中文可扩展 |

---

## 8. 测试策略

| 类型 | 工具 | 覆盖目标 |
|------|------|---------|
| 单元测试 | XCTest | ViewModel、Service、加密逻辑 |
| UI 测试 | XCUITest | 主要流程（配对、连接、命令下发） |
| 集成测试 | — | WebSocket 模拟 Gateway 通信 |

---

## 9. 里程碑

| 阶段 | 目标 | 交付物 |
|------|------|--------|
| **M1** | 基础框架 + WebSocket 连接 | 可连接 Gateway 并完成握手 |
| **M2** | 配对流程 + Token 管理 | 完成配对-审批-存储全流程 |
| **M3** | Canvas 能力 | WKWebView + `canvas.navigate` |
| **M4** | 其余 Node 能力 | Camera/Location/Screen |
| **M5** | UI 完善 + 错误处理 | 完整的 Settings + 错误提示 |
| **M6** | 测试 + 优化 | 单元/UI 测试，性能优化 |

---

## 10. 参考资料

- [OpenClaw Gateway Protocol](../gateway/protocol.md)
- [OpenClaw iOS 原型文档](../platforms/ios.md)
- [Bonjour/Discovery](../gateway/bonjour.md)
- [Pairing Flow](../gateway/pairing.md)
