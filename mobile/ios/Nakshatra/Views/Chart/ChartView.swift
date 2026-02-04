import SwiftUI

struct ChartView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var userPreferences: UserPreferences
    @State private var selectedSystem: AstrologySystem = .parashari
    @State private var selectedStyle: ChartStyle = .northIndian
    @State private var chartData: ChartAnalysis?
    @State private var interpretation: String?
    @State private var isLoading = false
    @State private var showBirthDetailsInput = false
    @State private var askQuestion = ""
    @State private var qaHistory: [[String: String]] = []
    @State private var qaAnswer: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    // System & Style Selector
                    systemSelector

                    if userPreferences.birthDetailsEntered {
                        if isLoading {
                            loadingView
                        } else if let chart = chartData {
                            // Chart Display
                            chartDisplay(chart: chart)

                            // Interpretation
                            if let interpretation = interpretation {
                                interpretationSection(interpretation)
                            }

                            // Q&A Section
                            qaSection

                            // Yogas Section
                            if !chart.yogas.isEmpty {
                                yogasSection(yogas: chart.yogas)
                            }

                            // Dasha Section
                            dashaSection(dasha: chart.currentDasha)
                        } else {
                            generateChartButton
                        }
                    } else {
                        enterBirthDetailsPrompt
                    }
                }
                .padding()
            }
            .background(Theme.backgroundColor)
            .navigationTitle("Birth Chart")
            .sheet(isPresented: $showBirthDetailsInput) {
                BirthDetailsInputView()
            }
        }
    }

    // MARK: - System Selector
    private var systemSelector: some View {
        VStack(spacing: Theme.Spacing.sm) {
            Picker("System", selection: $selectedSystem) {
                ForEach(AstrologySystem.allCases, id: \.self) { system in
                    Text(system.displayName).tag(system)
                }
            }
            .pickerStyle(.segmented)

            Picker("Style", selection: $selectedStyle) {
                ForEach(ChartStyle.allCases, id: \.self) { style in
                    Text(style.displayName).tag(style)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack(spacing: Theme.Spacing.md) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Generating your chart...")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(height: 300)
    }

    // MARK: - Chart Display
    @ViewBuilder
    private func chartDisplay(chart: ChartAnalysis) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            // Basic Info
            HStack(spacing: Theme.Spacing.lg) {
                VStack(alignment: .leading) {
                    Text("Ascendant")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(chart.chart.ascendantSign)
                        .font(Theme.Typography.headline)
                        .foregroundColor(Theme.textPrimary)
                }

                VStack(alignment: .leading) {
                    Text("Moon Sign")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(chart.chart.moonSign)
                        .font(Theme.Typography.headline)
                        .foregroundColor(Theme.textPrimary)
                }

                VStack(alignment: .leading) {
                    Text("Sun Sign")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(chart.chart.sunSign)
                        .font(Theme.Typography.headline)
                        .foregroundColor(Theme.textPrimary)
                }
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(Theme.primaryGradient.opacity(0.2))
            .cardStyle()

            // Chart Visual Placeholder
            ZStack {
                RoundedRectangle(cornerRadius: Theme.CornerRadius.large)
                    .fill(Theme.backgroundColor)
                    .frame(height: 300)

                Text("Chart Visualization")
                    .font(Theme.Typography.headline)
                    .foregroundColor(Theme.textSecondary)
            }
            .cardStyle()

            // Planetary Positions
            planetaryPositions(planets: chart.chart.planets)
        }
    }

    // MARK: - Planetary Positions
    @ViewBuilder
    private func planetaryPositions(planets: [PlanetPosition]) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Planetary Positions")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            ForEach(planets) { planet in
                HStack {
                    Text(planet.planet)
                        .font(Theme.Typography.body)
                        .frame(width: 70, alignment: .leading)

                    Text(planet.signName)
                        .font(Theme.Typography.body)
                        .foregroundColor(Theme.textSecondary)

                    Spacer()

                    Text("\(planet.degree)° \(planet.minute)'")
                        .font(Theme.Typography.footnote)
                        .foregroundColor(Theme.textSecondary)

                    if planet.isRetrograde {
                        Text("R")
                            .font(Theme.Typography.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal, 4)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(4)
                    }

                    Text("H\(planet.house)")
                        .font(Theme.Typography.footnote)
                        .foregroundColor(Theme.softLavender)
                }
                .padding(.vertical, Theme.Spacing.xxs)
            }
        }
        .padding()
        .background(Theme.backgroundColor)
        .cardStyle()
    }

    // MARK: - Interpretation Section
    @ViewBuilder
    private func interpretationSection(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Interpretation")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            Text(text)
                .font(Theme.Typography.body)
                .foregroundColor(Theme.textSecondary)
                .lineSpacing(4)
        }
        .padding()
        .background(Theme.mintGradient.opacity(0.2))
        .cardStyle()
    }

    // MARK: - Q&A Section
    private var qaSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Ask About Your Chart")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            HStack {
                TextField("Ask a question...", text: $askQuestion)
                    .textFieldStyle(.roundedBorder)

                Button(action: submitQuestion) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(Theme.primaryColor)
                }
                .disabled(askQuestion.isEmpty)
            }

            if let answer = qaAnswer {
                Text(answer)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.textSecondary)
                    .padding()
                    .background(Theme.paleBlue.opacity(0.3))
                    .cornerRadius(Theme.CornerRadius.medium)
            }
        }
        .padding()
        .background(Theme.backgroundColor)
        .cardStyle()
    }

    // MARK: - Yogas Section
    @ViewBuilder
    private func yogasSection(yogas: [Yoga]) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Yogas (Planetary Combinations)")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            ForEach(yogas) { yoga in
                VStack(alignment: .leading, spacing: Theme.Spacing.xxs) {
                    HStack {
                        Text(yoga.name)
                            .font(Theme.Typography.subheadline)
                            .fontWeight(.semibold)

                        Spacer()

                        Text(yoga.type.capitalized)
                            .font(Theme.Typography.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(yoga.type == "benefic" ? Theme.softMint : Theme.warmPeach)
                            .cornerRadius(4)
                    }

                    Text(yoga.description)
                        .font(Theme.Typography.footnote)
                        .foregroundColor(Theme.textSecondary)
                }
                .padding(.vertical, Theme.Spacing.xs)
            }
        }
        .padding()
        .background(Theme.backgroundColor)
        .cardStyle()
    }

    // MARK: - Dasha Section
    @ViewBuilder
    private func dashaSection(dasha: Dasha) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Current Dasha Period")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            HStack {
                VStack(alignment: .leading) {
                    Text("Mahadasha")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(dasha.planet)
                        .font(Theme.Typography.title3)
                        .foregroundColor(Theme.textPrimary)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("Until")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                    Text(dasha.endDate, style: .date)
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.textPrimary)
                }
            }
        }
        .padding()
        .background(Theme.primaryGradient.opacity(0.2))
        .cardStyle()
    }

    // MARK: - Generate Chart Button
    private var generateChartButton: some View {
        Button(action: generateChart) {
            Text("Generate Chart")
        }
        .buttonStyle(PrimaryButtonStyle())
    }

    // MARK: - Enter Birth Details Prompt
    private var enterBirthDetailsPrompt: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(Theme.softLavender)

            Text("Enter Your Birth Details")
                .font(Theme.Typography.title2)
                .foregroundColor(Theme.textPrimary)

            Text("We need your birth date, time, and location to generate your personalized Vedic birth chart.")
                .font(Theme.Typography.body)
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)

            Button(action: { showBirthDetailsInput = true }) {
                Text("Enter Birth Details")
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .padding(Theme.Spacing.xl)
    }

    // MARK: - Actions
    private func generateChart() {
        guard let birthDetails = userPreferences.birthDetails else { return }

        isLoading = true
        Task {
            do {
                let response = try await APIService.shared.generateChart(
                    birthDetails: birthDetails,
                    system: selectedSystem,
                    chartStyle: selectedStyle,
                    includeInterpretation: authManager.currentUser?.subscriptionTier != .free
                )
                await MainActor.run {
                    // Convert response to ChartAnalysis (simplified for demo)
                    interpretation = response.interpretation
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }

    private func submitQuestion() {
        guard !askQuestion.isEmpty, let chart = chartData else { return }

        let question = askQuestion
        askQuestion = ""

        Task {
            do {
                let answer = try await APIService.shared.askChartQuestion(
                    chartId: chart.chart.id,
                    question: question,
                    history: qaHistory
                )
                await MainActor.run {
                    qaAnswer = answer
                    qaHistory.append(["role": "user", "content": question])
                    qaHistory.append(["role": "assistant", "content": answer])
                }
            } catch {
                await MainActor.run {
                    qaAnswer = "Sorry, I couldn't process your question. Please try again."
                }
            }
        }
    }
}

#Preview {
    ChartView()
        .environmentObject(AuthManager())
        .environmentObject(UserPreferences())
}
