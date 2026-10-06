package com.healthone.model.enums;

/**
 * Emergency triage severity levels.
 * Demonstrates Enum with custom logic and calculations.
 */
public enum EmergencyLevel {
    LOW(1, "Low Priority", "#10B981", false),
    MODERATE(2, "Moderate Priority", "#3B82F6", false),
    HIGH(3, "High Priority", "#F59E0B", true),
    CRITICAL(4, "Critical Emergency", "#EF4444", true);

    private final int severityRank;
    private final String description;
    private final String colorHex;
    private final boolean requiresImmediateDispatch;

    EmergencyLevel(int severityRank, String description, String colorHex, boolean requiresImmediateDispatch) {
        this.severityRank = severityRank;
        this.description = description;
        this.colorHex = colorHex;
        this.requiresImmediateDispatch = requiresImmediateDispatch;
    }

    public int getSeverityRank() {
        return severityRank;
    }

    public String getDescription() {
        return description;
    }

    public String getColorHex() {
        return colorHex;
    }

    public boolean isRequiresImmediateDispatch() {
        return requiresImmediateDispatch;
    }

    public static EmergencyLevel calculateFromVitals(int systolicBp, int heartRate, int spo2) {
        if (systolicBp >= 180 || systolicBp <= 80 || heartRate >= 140 || heartRate <= 40 || spo2 <= 88) {
            return CRITICAL;
        } else if (systolicBp >= 150 || heartRate >= 110 || spo2 <= 92) {
            return HIGH;
        } else if (systolicBp >= 135 || heartRate >= 95 || spo2 <= 95) {
            return MODERATE;
        } else {
            return LOW;
        }
    }
}
