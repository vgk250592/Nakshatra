import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var userPreferences: UserPreferences
    @State private var currentPage = 0
    @State private var showLogin = false
    @State private var showRegister = false

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            image: "moon.stars.fill",
            title: "Ancient Wisdom",
            subtitle: "Experience authentic Vedic astrology based on thousands of years of Indian wisdom.",
            color: Theme.softLavender
        ),
        OnboardingPage(
            image: "brain.head.profile",
            title: "AI-Powered Insights",
            subtitle: "Get personalized interpretations powered by advanced AI trained on traditional texts.",
            color: Theme.softMint
        ),
        OnboardingPage(
            image: "chart.pie.fill",
            title: "Dual Systems",
            subtitle: "Access both Parashari and KP (Krishnamurti Paddhati) astrological systems.",
            color: Theme.warmPeach
        ),
        OnboardingPage(
            image: "questionmark.circle.fill",
            title: "Instant Answers",
            subtitle: "Ask horary questions and get immediate astrological guidance without birth details.",
            color: Theme.paleBlue
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Page Content
            TabView(selection: $currentPage) {
                ForEach(0..<pages.count, id: \.self) { index in
                    OnboardingPageView(page: pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Bottom Section
            VStack(spacing: Theme.Spacing.lg) {
                // Page Indicators
                HStack(spacing: Theme.Spacing.xs) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        Circle()
                            .fill(index == currentPage ? Theme.primaryColor : Theme.softGray.opacity(0.3))
                            .frame(width: 8, height: 8)
                            .animation(.easeInOut, value: currentPage)
                    }
                }

                // Buttons
                VStack(spacing: Theme.Spacing.md) {
                    Button(action: { showRegister = true }) {
                        Text("Get Started")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryButtonStyle())

                    Button(action: { showLogin = true }) {
                        Text("I already have an account")
                            .font(Theme.Typography.subheadline)
                            .foregroundColor(Theme.primaryColor)
                    }

                    Button(action: { authManager.loginAsDemo() }) {
                        Text("Try Demo Mode")
                            .font(Theme.Typography.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    .padding(.top, Theme.Spacing.sm)
                }
            }
            .padding(Theme.Spacing.lg)
            .background(Theme.backgroundColor)
        }
        .background(Theme.backgroundColor)
        .sheet(isPresented: $showLogin) {
            LoginView()
        }
        .sheet(isPresented: $showRegister) {
            RegisterView()
        }
    }
}

struct OnboardingPage {
    let image: String
    let title: String
    let subtitle: String
    let color: Color
}

struct OnboardingPageView: View {
    let page: OnboardingPage

    var body: some View {
        VStack(spacing: Theme.Spacing.xl) {
            Spacer()

            // Icon
            Image(systemName: page.image)
                .font(.system(size: 80))
                .foregroundColor(page.color)
                .padding(Theme.Spacing.xl)
                .background(page.color.opacity(0.2))
                .clipShape(Circle())

            // Text
            VStack(spacing: Theme.Spacing.md) {
                Text(page.title)
                    .font(Theme.Typography.title)
                    .foregroundColor(Theme.textPrimary)
                    .multilineTextAlignment(.center)

                Text(page.subtitle)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.Spacing.xl)
            }

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Login View
struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var usePhone = false
    @State private var phone = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.Spacing.lg) {
                Text("Welcome Back")
                    .font(Theme.Typography.title)
                    .foregroundColor(Theme.textPrimary)

                VStack(spacing: Theme.Spacing.md) {
                    if usePhone {
                        TextField("Phone Number", text: $phone)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.phonePad)
                    } else {
                        TextField("Email", text: $email)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                    }

                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)

                    Button(action: { usePhone.toggle() }) {
                        Text(usePhone ? "Use email instead" : "Use phone instead")
                            .font(Theme.Typography.caption)
                            .foregroundColor(Theme.primaryColor)
                    }
                }

                if let error = authManager.error {
                    Text(error)
                        .font(Theme.Typography.caption)
                        .foregroundColor(.red)
                }

                Button(action: login) {
                    HStack {
                        if authManager.isLoading {
                            ProgressView()
                                .tint(Theme.textPrimary)
                        } else {
                            Text("Sign In")
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(authManager.isLoading)

                Button(action: {
                    authManager.loginAsDemo()
                    dismiss()
                }) {
                    Text("Skip - Try Demo Mode")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.primaryColor)
                }

                Spacer()
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated { dismiss() }
        }
    }

    private func login() {
        Task {
            await authManager.login(
                email: usePhone ? nil : email,
                phone: usePhone ? phone : nil,
                password: password
            )
        }
    }
}

// MARK: - Register View
struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.Spacing.lg) {
                Text("Create Account")
                    .font(Theme.Typography.title)
                    .foregroundColor(Theme.textPrimary)

                VStack(spacing: Theme.Spacing.md) {
                    TextField("Name", text: $name)
                        .textFieldStyle(.roundedBorder)

                    TextField("Email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)

                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)

                    SecureField("Confirm Password", text: $confirmPassword)
                        .textFieldStyle(.roundedBorder)
                }

                if let error = authManager.error {
                    Text(error)
                        .font(Theme.Typography.caption)
                        .foregroundColor(.red)
                }

                if password != confirmPassword && !confirmPassword.isEmpty {
                    Text("Passwords don't match")
                        .font(Theme.Typography.caption)
                        .foregroundColor(.red)
                }

                Button(action: register) {
                    HStack {
                        if authManager.isLoading {
                            ProgressView()
                                .tint(Theme.textPrimary)
                        } else {
                            Text("Create Account")
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(authManager.isLoading || !isValid)

                Button(action: {
                    authManager.loginAsDemo()
                    dismiss()
                }) {
                    Text("Skip - Try Demo Mode")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.primaryColor)
                }

                Spacer()

                Text("By creating an account, you agree to our Terms of Service and Privacy Policy.")
                    .font(Theme.Typography.caption)
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated { dismiss() }
        }
    }

    private var isValid: Bool {
        !name.isEmpty && !email.isEmpty && password.count >= 8 && password == confirmPassword
    }

    private func register() {
        Task {
            await authManager.register(
                name: name,
                email: email,
                phone: nil,
                password: password
            )
        }
    }
}

#Preview {
    OnboardingView()
        .environmentObject(AuthManager())
        .environmentObject(UserPreferences())
}
