import SwiftUI

struct CompatibilityView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedSystem: CompatibilitySystem = .ashtakoot
    @State private var person1Name = ""
    @State private var person2Name = ""
    @State private var showPerson1Details = false
    @State private var showPerson2Details = false
    @State private var person1Details: BirthDetails?
    @State private var person2Details: BirthDetails?
    @State private var isLoading = false
    @State private var result: CompatibilityResponse?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.Spacing.lg) {
                    // Header Card
                    headerCard

                    // System Selection
                    systemSelection

                    // Person 1 Input
                    personInput(
                        title: "Person 1 (Bride)",
                        name: $person1Name,
                        details: person1Details,
                        showDetails: $showPerson1Details
                    )

                    // Person 2 Input
                    personInput(
                        title: "Person 2 (Groom)",
                        name: $person2Name,
                        details: person2Details,
                        showDetails: $showPerson2Details
                    )

                    // Match Button
                    matchButton

                    // Results
                    if let result = result {
                        resultsCard(result)
                    }
                }
                .padding()
            }
            .background(Theme.backgroundColor)
            .navigationTitle("Kundali Matching")
            .sheet(isPresented: $showPerson1Details) {
                BirthDetailsInputView(onSave: { details in
                    person1Details = details
                })
            }
            .sheet(isPresented: $showPerson2Details) {
                BirthDetailsInputView(onSave: { details in
                    person2Details = details
                })
            }
        }
    }

    // MARK: - Header Card
    private var headerCard: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            HStack {
                Image(systemName: "heart.circle.fill")
                    .font(.title)
                    .foregroundColor(Theme.warmPeach)

                Text("Marriage Compatibility")
                    .font(Theme.Typography.headline)
            }

            Text("Check compatibility between two horoscopes using traditional Vedic matching systems.")
                .font(Theme.Typography.subheadline)
                .foregroundColor(Theme.textSecondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.peachGradient.opacity(0.3))
        .cardStyle()
    }

    // MARK: - System Selection
    private var systemSelection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Matching System")
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            Picker("System", selection: $selectedSystem) {
                ForEach(CompatibilitySystem.allCases, id: \.self) { system in
                    Text(system.displayName).tag(system)
                }
            }
            .pickerStyle(.segmented)

            Text(selectedSystem == .ashtakoot
                 ? "North Indian 36-point Guna Milan system"
                 : "South Indian 10-point Porutham system")
                .font(Theme.Typography.caption)
                .foregroundColor(Theme.textSecondary)
        }
    }

    // MARK: - Person Input
    @ViewBuilder
    private func personInput(
        title: String,
        name: Binding<String>,
        details: BirthDetails?,
        showDetails: Binding<Bool>
    ) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text(title)
                .font(Theme.Typography.headline)
                .foregroundColor(Theme.textPrimary)

            TextField("Name", text: name)
                .textFieldStyle(.roundedBorder)

            Button(action: { showDetails.wrappedValue = true }) {
                HStack {
                    Image(systemName: details != nil ? "checkmark.circle.fill" : "calendar.badge.plus")
                        .foregroundColor(details != nil ? Theme.softMint : Theme.textSecondary)

                    Text(details != nil ? "Birth details entered" : "Enter birth details")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(details != nil ? Theme.textPrimary : Theme.textSecondary)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .foregroundColor(Theme.textSecondary)
                }
                .padding()
                .background(Theme.backgroundColor)
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.CornerRadius.medium)
                        .stroke(Theme.softGray.opacity(0.3), lineWidth: 1)
                )
                .cornerRadius(Theme.CornerRadius.medium)
            }
        }
    }

    // MARK: - Match Button
    private var matchButton: some View {
        Button(action: performMatch) {
            HStack {
                if isLoading {
                    ProgressView()
                        .tint(Theme.textPrimary)
                } else {
                    Image(systemName: "heart.fill")
                    Text("Check Compatibility")
                }
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!canMatch || isLoading)
        .opacity(canMatch ? 1 : 0.6)
    }

    private var canMatch: Bool {
        !person1Name.isEmpty && !person2Name.isEmpty &&
        person1Details != nil && person2Details != nil
    }

    // MARK: - Results Card
    @ViewBuilder
    private func resultsCard(_ response: CompatibilityResponse) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
            // Score Header
            HStack {
                VStack(alignment: .leading) {
                    Text("Compatibility Score")
                        .font(Theme.Typography.subheadline)
                        .foregroundColor(Theme.textSecondary)

                    Text("\(Int(response.result.percentage))%")
                        .font(Theme.Typography.largeTitle)
                        .foregroundColor(compatibilityColor(response.result.overallCompatibility))
                }

                Spacer()

                compatibilityBadge(response.result.overallCompatibility)
            }

            // Score Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Theme.softGray.opacity(0.3))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(compatibilityColor(response.result.overallCompatibility))
                        .frame(width: geometry.size.width * (response.result.percentage / 100), height: 8)
                }
            }
            .frame(height: 8)

            // Recommendation
            Text(response.result.recommendation)
                .font(Theme.Typography.body)
                .foregroundColor(Theme.textSecondary)

            // Interpretation
            if let interpretation = response.interpretation {
                Divider()

                Text("Detailed Analysis")
                    .font(Theme.Typography.headline)
                    .foregroundColor(Theme.textPrimary)

                Text(interpretation)
                    .font(Theme.Typography.body)
                    .foregroundColor(Theme.textSecondary)
                    .lineSpacing(4)
            }
        }
        .padding()
        .background(Theme.backgroundColor)
        .cardStyle()
    }

    private func compatibilityColor(_ status: String) -> Color {
        switch status {
        case "highly_compatible": return Theme.softMint
        case "compatible": return Theme.paleBlue
        case "average": return .yellow
        default: return Theme.warmPeach
        }
    }

    @ViewBuilder
    private func compatibilityBadge(_ status: String) -> some View {
        let (text, color): (String, Color) = {
            switch status {
            case "highly_compatible": return ("Excellent", Theme.softMint)
            case "compatible": return ("Good", Theme.paleBlue)
            case "average": return ("Average", .yellow)
            default: return ("Needs Review", Theme.warmPeach)
            }
        }()

        Text(text)
            .font(Theme.Typography.caption)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(color)
            .cornerRadius(Theme.CornerRadius.pill)
    }

    // MARK: - Actions
    private func performMatch() {
        guard let p1Details = person1Details, let p2Details = person2Details else { return }

        isLoading = true
        Task {
            do {
                let response = try await APIService.shared.matchCompatibility(
                    person1Name: person1Name,
                    person1BirthDetails: p1Details,
                    person2Name: person2Name,
                    person2BirthDetails: p2Details,
                    system: selectedSystem
                )
                await MainActor.run {
                    self.result = response
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                }
            }
        }
    }
}

#Preview {
    CompatibilityView()
        .environmentObject(AuthManager())
}
