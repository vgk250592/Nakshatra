import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var userPreferences: UserPreferences
    @State private var showEditBirthDetails = false
    @State private var showSubscriptionPlans = false
    @State private var selectedChartStyle: ChartStyle = .northIndian
    @State private var selectedSystem: AstrologySystem = .parashari
    @State private var selectedLanguage: Language = .english

    var body: some View {
        NavigationStack {
            List {
                // User Info Section
                Section {
                    if let user = authManager.currentUser {
                        userInfoRow(user: user)
                    }
                }

                // Birth Details Section
                Section("Birth Details") {
                    if userPreferences.birthDetailsEntered {
                        birthDetailsRow
                    } else {
                        Button(action: { showEditBirthDetails = true }) {
                            Label("Add Birth Details", systemImage: "plus.circle.fill")
                        }
                    }
                }

                // Subscription Section
                Section("Subscription") {
                    subscriptionRow
                }

                // Preferences Section
                Section("Preferences") {
                    preferencesRows
                }

                // App Info Section
                Section("About") {
                    aboutRows
                }

                // Account Section
                Section {
                    Button(action: { authManager.logout() }) {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Profile")
            .sheet(isPresented: $showEditBirthDetails) {
                BirthDetailsInputView()
            }
            .sheet(isPresented: $showSubscriptionPlans) {
                SubscriptionPlansView()
            }
        }
    }

    // MARK: - User Info Row
    @ViewBuilder
    private func userInfoRow(user: User) -> some View {
        HStack(spacing: Theme.Spacing.md) {
            Circle()
                .fill(Theme.primaryGradient)
                .frame(width: 60, height: 60)
                .overlay(
                    Text(String(user.name.prefix(1)))
                        .font(Theme.Typography.title)
                        .foregroundColor(Theme.textPrimary)
                )

            VStack(alignment: .leading, spacing: Theme.Spacing.xxs) {
                Text(user.name)
                    .font(Theme.Typography.headline)

                if let email = user.email {
                    Text(email)
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.textSecondary)
                }

                HStack {
                    Image(systemName: "star.fill")
                        .font(.caption)
                        .foregroundColor(.yellow)
                    Text(user.subscriptionTier.displayName)
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                }
            }
        }
        .padding(.vertical, Theme.Spacing.xs)
    }

    // MARK: - Birth Details Row
    private var birthDetailsRow: some View {
        Button(action: { showEditBirthDetails = true }) {
            HStack {
                VStack(alignment: .leading, spacing: Theme.Spacing.xxs) {
                    if let details = userPreferences.birthDetails {
                        Text(details.date)
                            .font(Theme.Typography.body)
                        Text("\(details.time) • \(details.city ?? "Unknown")")
                            .font(Theme.Typography.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                }

                Spacer()

                Image(systemName: "pencil.circle.fill")
                    .foregroundColor(Theme.primaryColor)
            }
        }
    }

    // MARK: - Subscription Row
    private var subscriptionRow: some View {
        Button(action: { showSubscriptionPlans = true }) {
            HStack {
                VStack(alignment: .leading, spacing: Theme.Spacing.xxs) {
                    Text(authManager.currentUser?.subscriptionTier.displayName ?? "Free")
                        .font(Theme.Typography.headline)

                    Text("Tap to view plans")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                }

                Spacer()

                if authManager.currentUser?.subscriptionTier == .free {
                    Text("Upgrade")
                        .font(Theme.Typography.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Theme.primaryGradient)
                        .cornerRadius(Theme.CornerRadius.pill)
                }
            }
        }
    }

    // MARK: - Preferences Rows
    private var preferencesRows: some View {
        Group {
            Picker("Chart Style", selection: $selectedChartStyle) {
                ForEach(ChartStyle.allCases, id: \.self) { style in
                    Text(style.displayName).tag(style)
                }
            }
            .onChange(of: selectedChartStyle) { _, newValue in
                userPreferences.chartStyle = newValue
            }

            Picker("Astrology System", selection: $selectedSystem) {
                ForEach(AstrologySystem.allCases, id: \.self) { system in
                    Text(system.displayName).tag(system)
                }
            }
            .onChange(of: selectedSystem) { _, newValue in
                userPreferences.astrologySystem = newValue
            }

            Picker("Language", selection: $selectedLanguage) {
                ForEach(Language.allCases, id: \.self) { lang in
                    Text(lang.displayName).tag(lang)
                }
            }
            .onChange(of: selectedLanguage) { _, newValue in
                userPreferences.language = newValue
            }
        }
        .onAppear {
            selectedChartStyle = userPreferences.chartStyle
            selectedSystem = userPreferences.astrologySystem
            selectedLanguage = userPreferences.language
        }
    }

    // MARK: - About Rows
    private var aboutRows: some View {
        Group {
            Link(destination: URL(string: "https://nakshatra.app/privacy")!) {
                Label("Privacy Policy", systemImage: "lock.shield")
            }

            Link(destination: URL(string: "https://nakshatra.app/terms")!) {
                Label("Terms of Service", systemImage: "doc.text")
            }

            HStack {
                Label("Version", systemImage: "info.circle")
                Spacer()
                Text("1.0.0")
                    .foregroundColor(Theme.textSecondary)
            }
        }
    }
}

// MARK: - Subscription Plans View
struct SubscriptionPlansView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    Text("Choose Your Plan")
                        .font(Theme.Typography.title)
                        .padding(.top)

                    // Free Plan
                    PlanCard(
                        name: "Free",
                        price: "₹0",
                        period: "forever",
                        features: [
                            "Basic Parashari chart",
                            "1 horary question/month",
                            "Daily horoscope",
                        ],
                        isPopular: false
                    )

                    // Premium Plan
                    PlanCard(
                        name: "Premium",
                        price: "₹299",
                        period: "per month",
                        features: [
                            "Both Parashari & KP systems",
                            "3 horary questions/month",
                            "3 compatibility matches/month",
                            "Detailed interpretations",
                            "Monthly & yearly predictions",
                        ],
                        isPopular: false
                    )

                    // Premium Plus Plan
                    PlanCard(
                        name: "Premium Plus",
                        price: "₹599",
                        period: "per month",
                        features: [
                            "Everything in Premium",
                            "Unlimited horary questions",
                            "Unlimited compatibility matches",
                            "Personalized remedies",
                            "Priority AI support",
                        ],
                        isPopular: true
                    )
                }
                .padding()
            }
            .navigationTitle("Subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct PlanCard: View {
    let name: String
    let price: String
    let period: String
    let features: [String]
    let isPopular: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            if isPopular {
                Text("MOST POPULAR")
                    .font(Theme.Typography.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Theme.primaryColor)
                    .cornerRadius(4)
            }

            HStack(alignment: .bottom) {
                Text(price)
                    .font(Theme.Typography.largeTitle)
                    .foregroundColor(Theme.textPrimary)

                Text(period)
                    .font(Theme.Typography.subheadline)
                    .foregroundColor(Theme.textSecondary)
                    .padding(.bottom, 6)
            }

            Text(name)
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            Divider()

            ForEach(features, id: \.self) { feature in
                HStack(spacing: Theme.Spacing.sm) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Theme.softMint)

                    Text(feature)
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.textSecondary)
                }
            }

            if name == "Free" {
                Button(action: {}) {
                    Text("Current Plan")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryButtonStyle())
                .disabled(true)
            } else {
                Button(action: {}) {
                    Text("Subscribe")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
        .padding()
        .background(Theme.backgroundColor)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.CornerRadius.large)
                .stroke(isPopular ? Theme.primaryColor : Theme.softGray.opacity(0.3), lineWidth: isPopular ? 2 : 1)
        )
        .cornerRadius(Theme.CornerRadius.large)
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
        .environmentObject(UserPreferences())
}
