import SwiftUI
import CoreLocation

struct BirthDetailsInputView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var userPreferences: UserPreferences

    var onSave: ((BirthDetails) -> Void)?

    @State private var birthDate = Date()
    @State private var birthTime = Date()
    @State private var city = ""
    @State private var country = "India"
    @State private var latitude: Double = 28.6139
    @State private var longitude: Double = 77.2090
    @State private var timezone = "Asia/Kolkata"
    @State private var searchResults: [LocationResult] = []
    @State private var isSearching = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Date & Time") {
                    DatePicker(
                        "Birth Date",
                        selection: $birthDate,
                        displayedComponents: .date
                    )

                    DatePicker(
                        "Birth Time",
                        selection: $birthTime,
                        displayedComponents: .hourAndMinute
                    )

                    Text("Enter the exact birth time for accurate chart calculation")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                }

                Section("Birth Place") {
                    TextField("City", text: $city)
                        .onChange(of: city) { _, newValue in
                            if newValue.count > 2 {
                                searchLocation(query: newValue)
                            }
                        }

                    if !searchResults.isEmpty {
                        ForEach(searchResults) { result in
                            Button(action: { selectLocation(result) }) {
                                VStack(alignment: .leading) {
                                    Text(result.name)
                                        .font(Theme.Typography.body)
                                    Text(result.country)
                                        .font(Theme.Typography.caption)
                                        .foregroundColor(Theme.textSecondary)
                                }
                            }
                        }
                    }

                    if !city.isEmpty && searchResults.isEmpty {
                        HStack {
                            Text("Latitude")
                            Spacer()
                            TextField("Lat", value: $latitude, format: .number)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 100)
                        }

                        HStack {
                            Text("Longitude")
                            Spacer()
                            TextField("Lng", value: $longitude, format: .number)
                                .textFieldStyle(.roundedBorder)
                                .frame(width: 100)
                        }
                    }

                    Picker("Timezone", selection: $timezone) {
                        Text("IST (Asia/Kolkata)").tag("Asia/Kolkata")
                        Text("UTC").tag("UTC")
                        Text("EST (America/New_York)").tag("America/New_York")
                        Text("PST (America/Los_Angeles)").tag("America/Los_Angeles")
                        Text("GMT (Europe/London)").tag("Europe/London")
                    }
                }

                Section {
                    Text("Accurate birth details are essential for precise astrological calculations. If you don't know the exact birth time, try to get it from birth records or family members.")
                        .font(Theme.Typography.caption)
                        .foregroundColor(Theme.textSecondary)
                }
            }
            .navigationTitle("Birth Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(city.isEmpty)
                }
            }
        }
    }

    private func searchLocation(query: String) {
        // Simplified location search - in production, use a geocoding API
        isSearching = true

        // Mock results for common Indian cities
        let mockCities: [LocationResult] = [
            LocationResult(name: "New Delhi", country: "India", latitude: 28.6139, longitude: 77.2090, timezone: "Asia/Kolkata"),
            LocationResult(name: "Mumbai", country: "India", latitude: 19.0760, longitude: 72.8777, timezone: "Asia/Kolkata"),
            LocationResult(name: "Bangalore", country: "India", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata"),
            LocationResult(name: "Chennai", country: "India", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata"),
            LocationResult(name: "Kolkata", country: "India", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata"),
            LocationResult(name: "Hyderabad", country: "India", latitude: 17.3850, longitude: 78.4867, timezone: "Asia/Kolkata"),
            LocationResult(name: "Pune", country: "India", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata"),
            LocationResult(name: "Ahmedabad", country: "India", latitude: 23.0225, longitude: 72.5714, timezone: "Asia/Kolkata"),
            LocationResult(name: "Jaipur", country: "India", latitude: 26.9124, longitude: 75.7873, timezone: "Asia/Kolkata"),
            LocationResult(name: "Lucknow", country: "India", latitude: 26.8467, longitude: 80.9462, timezone: "Asia/Kolkata"),
        ]

        searchResults = mockCities.filter {
            $0.name.lowercased().contains(query.lowercased())
        }

        isSearching = false
    }

    private func selectLocation(_ location: LocationResult) {
        city = location.name
        country = location.country
        latitude = location.latitude
        longitude = location.longitude
        timezone = location.timezone
        searchResults = []
    }

    private func save() {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: birthDate)

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm:ss"
        let timeString = timeFormatter.string(from: birthTime)

        let details = BirthDetails(
            date: dateString,
            time: timeString,
            latitude: latitude,
            longitude: longitude,
            timezone: timezone,
            city: city,
            country: country
        )

        if let onSave = onSave {
            onSave(details)
        } else {
            userPreferences.saveBirthDetails(details)
        }

        dismiss()
    }
}

struct LocationResult: Identifiable {
    let id = UUID()
    let name: String
    let country: String
    let latitude: Double
    let longitude: Double
    let timezone: String
}

#Preview {
    BirthDetailsInputView()
        .environmentObject(UserPreferences())
}
