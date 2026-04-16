import SwiftUI

struct ContentView: View {
    @EnvironmentObject var nodeSession: NodeSession
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            DiscoveryView { endpoint in
                Task {
                    try? await nodeSession.connect(to: endpoint)
                }
            }
            .tabItem {
                Label("Discovery", systemImage: "antenna.radiowaves.left.and.right")
            }
            .tag(1)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .tint(.accentColor)
    }
}

#if DEBUG
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(NodeSession.shared)
    }
}
#endif
