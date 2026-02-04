import SwiftUI

@main
struct NakshatraApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var userPreferences = UserPreferences()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(userPreferences)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                OnboardingView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
    }
}

// MARK: - Main Tab View
struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)

            ChartView()
                .tabItem {
                    Image(systemName: "circle.hexagonpath.fill")
                    Text("Chart")
                }
                .tag(1)

            HoraryView()
                .tabItem {
                    Image(systemName: "questionmark.circle.fill")
                    Text("Ask")
                }
                .tag(2)

            CompatibilityView()
                .tabItem {
                    Image(systemName: "heart.circle.fill")
                    Text("Match")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Image(systemName: "person.circle.fill")
                    Text("Profile")
                }
                .tag(4)
        }
        .tint(Theme.primaryColor)
    }
}

// MARK: - Preview
#Preview {
    ContentView()
        .environmentObject(AuthManager())
        .environmentObject(UserPreferences())
}
