package com.healthone.model.enums;

/**
 * Appointment lifecycle status with state machine transition checks.
 * Demonstrates:
 * - Enum state machine transitions
 */
public enum AppointmentStatus {
    PENDING("Pending Confirmation"),
    CONFIRMED("Confirmed"),
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed"),
    CANCELLED("Cancelled"),
    RESCHEDULED("Rescheduled");

    private final String label;

    AppointmentStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public boolean canTransitionTo(AppointmentStatus next) {
        return switch (this) {
            case PENDING -> next == CONFIRMED || next == CANCELLED || next == RESCHEDULED;
            case CONFIRMED -> next == IN_PROGRESS || next == CANCELLED || next == RESCHEDULED;
            case IN_PROGRESS -> next == COMPLETED || next == CANCELLED;
            case RESCHEDULED -> next == CONFIRMED || next == CANCELLED;
            case COMPLETED, CANCELLED -> false; // Terminal states
        };
    }
}
