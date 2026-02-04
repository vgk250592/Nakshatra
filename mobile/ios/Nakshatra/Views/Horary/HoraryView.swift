import SwiftUI

struct HoraryView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedCategory: HoraryCategory = .general
    @State private var question: String = ""
    @State private var selectedNumber: Int = 1
    @State private var showNumberPicker = false
    @State private var isLoading = false
    @State private var response: HoraryResponse?
    @State private var quotaInfo: QuotaInfo?
    @State private var showGuidance = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    // Guidance Card
                    guidanceCard

                    // Category Selection
                    categorySelection

                    // Question Input
                    questionInput

                    // Number Selection
                    numberSelection

                    // Submit Button
                    submitButton

                    // Response
                    if let response = response {
                        responseCard(response)
                    }

                    // Quota Info
                    if let quota = quotaInfo {
                        quotaCard(quota)
                    }
                }
                .padding()
            }
            .background(Theme.backgroundColor)
            .navigationTitle("Ask a Question")
            .sheet(isPresented: $showGuidance) {
                guidanceSheet
            }
            .onAppear {
                loadQuota()
            }
        }
    }

    // MARK: - Guidance Card
    private var guidanceCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(.yellow)
                Text("Prashna Jyotish (Horary Astrology)")
                    .font(Theme.Typography.headline)
                Spacer()
                Button(action: { showGuidance = true }) {
                    Image(systemName: "info.circle")
                        .foregroundColor(Theme.textSecondary)
                }
            }

            Text("Get instant answers to your questions using the ancient science of horary astrology. No birth details needed!")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.textSecondary)
        }
        .padding()
        .background(Theme.peachGradient.opacity(0.3))
        .cardStyle()
    }

    // MARK: - Category Selection
    private var categorySelection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Question Category")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible()),
            ], spacing: Theme.Spacing.sm) {
                ForEach(HoraryCategory.allCases, id: \.self) { category in
                    CategoryButton(
                        category: category,
                        isSelected: selectedCategory == category
                    ) {
                        selectedCategory = category
                    }
                }
            }
        }
    }

    // MARK: - Question Input
    private var questionInput: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Your Question")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            TextEditor(text: $question)
                .frame(height: 100)
                .padding(Theme.Spacing.sm)
                .background(Theme.backgroundColor)
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.CornerRadius.medium)
                        .stroke(Theme.softGray.opacity(0.3), lineWidth: 1)
                )
                .cornerRadius(Theme.CornerRadius.medium)

            Text("Be specific and clear about what you want to know.")
                .font(Theme.Typography.caption)
                .foregroundColor(Theme.textSecondary)
        }
    }

    // MARK: - Number Selection
    private var numberSelection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Text("KP Number")
                    .font(Theme.Typography.headline)
                    .foregroundColor(Theme.textPrimary)

                Spacer()

                Button(action: { showGuidance = true }) {
                    Text("How to select?")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.primaryColor)
                }
            }

            HStack {
                Text("Think of a number between 1-249")
                    .font(Theme.Typography.subheadline)
                    .foregroundColor(Theme.textSecondary)

                Spacer()

                Button(action: { showNumberPicker = true }) {
                    HStack {
                        Text("\(selectedNumber)")
                            .font(Theme.Typography.title2)
                            .foregroundColor(Theme.textPrimary)

                        Image(systemName: "chevron.down")
                            .foregroundColor(Theme.textSecondary)
                    }
                    .padding(.horizontal, Theme.Spacing.md)
                    .padding(.vertical, Theme.Spacing.sm)
                    .background(Theme.primaryGradient.opacity(0.3))
                    .cornerRadius(Theme.CornerRadius.medium)
                }
            }
        }
        .sheet(isPresented: $showNumberPicker) {
            numberPickerSheet
        }
    }

    // MARK: - Submit Button
    private var submitButton: some View {
        Button(action: submitQuestion) {
            HStack {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Get Answer")
                }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(question.count < 10 || isLoading)
        .opacity(question.count < 10 ? 0.6 : 1)
    }

    // MARK: - Response Card
    @ViewBuilder
    private func responseCard(_ response: HoraryResponse) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(Theme.softLavender)
                Text("Answer")
                    .font(Theme.Typography.headline)
                    .foregroundColor(Theme.textPrimary)
            }

            Text(response.interpretation)
                .font(Theme.Typography.body)
                .foregroundColor(Theme.textSecondary)
                .lineSpacing(4)

            Divider()

            HStack {
                Text("Ruling Planets:")
                    .font(Theme.Typography.caption)
                    .foregroundColor(Theme.textSecondary)

                ForEach(response.rulingPlanets, id: \.self) { planet in
                    Text(planet)
                        .font(Theme.Typography.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Theme.softLavender.opacity(0.3))
                        .cornerRadius(4)
                }
            }
        }
        .padding()
        .background(Theme.mintGradient.opacity(0.2))
        .cardStyle()
    }

    // MARK: - Quota Card
    @ViewBuilder
    private func quotaCard(_ quota: QuotaInfo) -> some View {
        HStack {
            Text("Questions remaining this month:")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.textSecondary)

            Spacer()

            Text("\(quota.remaining)/\(quota.limit)")
                .font(Theme.Typography.headline)
                .foregroundColor(quota.remaining > 0 ? Theme.softMint : Theme.warmPeach)
        }
        .padding()
        .background(Theme.backgroundColor)
        .cardStyle()
    }

    // MARK: - Number Picker Sheet
    private var numberPickerSheet: some View {
        NavigationStack {
            VStack {
                Picker("Number", selection: $selectedNumber) {
                    ForEach(1...249, id: \.self) { number in
                        Text("\(number)").tag(number)
                    }
                }
                .pickerStyle(.wheel)
            }
            .navigationTitle("Select Number")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        showNumberPicker = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Guidance Sheet
    private var guidanceSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    Text("How to Ask a Horary Question")
                        .font(Theme.Typography.title2)

                    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
                        guidanceStep(number: 1, text: "Think deeply about your question")
                        guidanceStep(number: 2, text: "Close your eyes and concentrate")
                        guidanceStep(number: 3, text: "When ready, think of a number between 1 and 249")
                        guidanceStep(number: 4, text: "Use the first number that comes to mind")
                        guidanceStep(number: 5, text: "Don't second-guess or change it")
                    }

                    Text("The number you select determines the ascendant of your horary chart, which is crucial for accurate predictions.")
                        .font(Theme.Typography.body)
                        .foregroundColor(Theme.textSecondary)
                }
                .padding()
            }
            .navigationTitle("Guidance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        showGuidance = false
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func guidanceStep(number: Int, text: String) -> some View {
        HStack(alignment: .top, spacing: Theme.Spacing.sm) {
            Text("\(number)")
                .font(Theme.Typography.headline)
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(Theme.primaryColor)
                .clipShape(Circle())

            Text(text)
                .font(Theme.Typography.body)
                .foregroundColor(Theme.textPrimary)
        }
    }

    // MARK: - Actions
    private func loadQuota() {
        Task {
            do {
                let quota = try await APIService.shared.getHoraryQuota()
                await MainActor.run {
                    quotaInfo = quota
                }
            } catch {
                // Handle error
            }
        }
    }

    private func submitQuestion() {
        isLoading = true
        Task {
            do {
                let result = try await APIService.shared.askHoraryQuestion(
                    question: question,
                    category: selectedCategory,
                    selectedNumber: selectedNumber,
                    latitude: 28.6139, // Default Delhi
                    longitude: 77.2090
                )
                await MainActor.run {
                    response = result
                    isLoading = false
                    loadQuota()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Category Button
struct CategoryButton: View {
    let category: HoraryCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: Theme.Spacing.xxs) {
                Image(systemName: category.icon)
                    .font(.title3)

                Text(category.displayName)
                    .font(Theme.Typography.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Theme.Spacing.sm)
            .background(isSelected ? Theme.primaryGradient : LinearGradient(colors: [Theme.backgroundColor], startPoint: .top, endPoint: .bottom))
            .foregroundColor(isSelected ? Theme.textPrimary : Theme.textSecondary)
            .cornerRadius(Theme.CornerRadius.medium)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.CornerRadius.medium)
                    .stroke(isSelected ? Color.clear : Theme.softGray.opacity(0.3), lineWidth: 1)
            )
        }
    }
}

#Preview {
    HoraryView()
        .environmentObject(AuthManager())
}
