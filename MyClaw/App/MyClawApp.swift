import SwiftUI

@main
struct MyClawApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var nodeSession = NodeSession.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(nodeSession)
        }
    }
}
