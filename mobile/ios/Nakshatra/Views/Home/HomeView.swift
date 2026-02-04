import SwiftUI

struct HomeView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var userPreferences: UserPreferences
    @State private var dailyPrediction: String = ""
    @State private var isLoadingPrediction = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    // Welcome Header
                    welcomeHeader

                    // Daily Horoscope Card
                    dailyHoroscopeCard

                    // Quick Actions
                    quickActions

                    // Features Grid
                    featuresGrid
                }
                .padding()
            }
            .background(Theme.backgroundColor)
            .navigationTitle("Nakshatra")
            .navigationBarTitleDisplayMode(.large)
        }
        .onAppear {
            loadDailyPrediction()
        }
    }

    // MARK: - Welcome Header
    private var welcomeHeader: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            Text(greeting)
                .font(Theme.Typography.title2)
                .foregroundColor(Theme.textPrimary)

            if let user = authManager.currentUser {
                Text(user.name)
                    .font(Theme.Typography.title)
                    .foregroundColor(Theme.textPrimary)
            }

            if let moonSign = authManager.currentUser?.birthDetails != nil ? "Cancer" : nil {
                HStack {
                    Image(systemName: "moon.stars.fill")
                        .foregroundColor(Theme.softLavender)
                    Text("Moon Sign: \(moonSign)")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.textSecondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good Morning"
        case 12..<17: return "Good Afternoon"
        case 17..<21: return "Good Evening"
        default: return "Good Night"
        }
    }

    // MARK: - Daily Horoscope Card
    private var dailyHoroscopeCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            HStack {
                Image(systemName: "sun.max.fill")
                    .font(.title2)
                    .foregroundColor(.orange)
                Text("Today's Horoscope")
                    .font(Theme.Typography.headline)
                    .foregroundColor(Theme.textPrimary)
                Spacer()
                Text(Date(), style: .date)
                    .font(Theme.Typography.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            if isLoadingPrediction {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, Theme.Spacing.lg)
            } else {
                Text(dailyPrediction)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.textSecondary)
                    .lineSpacing(4)
            }
        }
        .padding(Theme.Spacing.lg)
        .background(Theme.peachGradient.opacity(0.3))
        .cardStyle()
    }

    // MARK: - Quick Actions
    private var quickActions: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Quick Actions")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            HStack(spacing: Theme.Spacing.md) {
                QuickActionButton(
                    icon: "circle.hexagonpath.fill",
                    title: "View Chart",
                    color: Theme.softLavender
                ) {
                    // Navigate to chart
                }

                QuickActionButton(
                    icon: "questionmark.circle.fill",
                    title: "Ask Question",
                    color: Theme.softMint
                ) {
                    // Navigate to horary
                }

                QuickActionButton(
                    icon: "heart.circle.fill",
                    title: "Match",
                    color: Theme.warmPeach
                ) {
                    // Navigate to compatibility
                }
            }
        }
    }

    // MARK: - Features Grid
    private var featuresGrid: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Explore")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
            ], spacing: Theme.Spacing.md) {
                FeatureCard(
                    icon: "star.fill",
                    title: "Birth Chart",
                    description: "Detailed Kundali analysis",
                    gradient: Theme.primaryGradient
                )

                FeatureCard(
                    icon: "calendar",
                    title: "Dasha",
                    description: "Planetary periods",
                    gradient: Theme.mintGradient
                )

                FeatureCard(
                    icon: "sparkles",
                    title: "Yogas",
                    description: "Planetary combinations",
                    gradient: Theme.peachGradient
                )

                FeatureCard(
                    icon: "leaf.fill",
                    title: "Remedies",
                    description: "Personalized solutions",
                    gradient: Theme.primaryGradient
                )
            }
        }
    }

    // MARK: - Helper Methods
    private func loadDailyPrediction() {
        Task {
            do {
                let sign = authManager.currentUser?.birthDetails != nil ? "Cancer" : "Aries"
                let prediction = try await APIService.shared.getDailyPrediction(sign: sign)
                await MainActor.run {
                    dailyPrediction = prediction
                    isLoadingPrediction = false
                }
            } catch {
                await MainActor.run {
                    dailyPrediction = "Unable to load today's horoscope. Please try again later."
                    isLoadingPrediction = false
                }
            }
        }
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
    let icon: String
    let title: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: Theme.Spacing.xs) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)

                Text(title)
                    .font(Theme.Typography.caption)
                    .foregroundColor(Theme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(Theme.Spacing.md)
            .background(Theme.backgroundColor)
            .cardStyle()
        }
    }
}

// MARK: - Feature Card
struct FeatureCard: View {
    let icon: String
    let title: String
    let description: String
    let gradient: LinearGradient

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .padding(Theme.Spacing.sm)
                .background(gradient)
                .cornerRadius(Theme.CornerRadius.medium)

            Text(title)
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            Text(description)
                .font(Theme.Typography.caption)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.Spacing.md)
        .background(Theme.backgroundColor)
        .cardStyle()
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager())
        .environmentObject(UserPreferences())
}
