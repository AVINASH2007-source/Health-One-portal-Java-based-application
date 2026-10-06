package com.healthone.model.appointment;

import com.healthone.model.common.BaseEntity;
import com.healthone.model.common.Exportable;
import com.healthone.model.enums.AppointmentStatus;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Appointment Entity.
 * Demonstrates:
 * - Builder pattern
 * - State management with enum transitions
 * - Inheritance & Interfaces
 */
public class Appointment extends BaseEntity<String> implements Exportable {

    private static final long serialVersionUID = 1L;

    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private String department;
    private LocalDate appointmentDate;
    private LocalTime appointmentTime;
    private String reason;
    private AppointmentStatus status;
    private String notes;
    private String type; // "In-Person", "Follow-up", "Consultation"

    private Appointment(Builder builder) {
        super(builder.id, builder.patientId);
        this.patientId = builder.patientId;
        this.patientName = builder.patientName;
        this.doctorId = builder.doctorId;
        this.doctorName = builder.doctorName;
        this.department = builder.department;
        this.appointmentDate = builder.appointmentDate;
        this.appointmentTime = builder.appointmentTime;
        this.reason = builder.reason;
        this.status = builder.status != null ? builder.status : AppointmentStatus.CONFIRMED;
        this.notes = builder.notes;
        this.type = builder.type;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String getPatientId() { return patientId; }
    public String getPatientName() { return patientName; }
    public String getDoctorId() { return doctorId; }
    public String getDoctorName() { return doctorName; }
    public String getDepartment() { return department; }
    public LocalDate getAppointmentDate() { return appointmentDate; }
    public LocalTime getAppointmentTime() { return appointmentTime; }
    public String getReason() { return reason; }
    public AppointmentStatus getStatus() { return status; }
    public String getNotes() { return notes; }
    public String getType() { return type; }

    public boolean updateStatus(AppointmentStatus newStatus) {
        if (this.status.canTransitionTo(newStatus)) {
            this.status = newStatus;
            touch();
            return true;
        }
        return false;
    }

    @Override
    public String toJson() {
        return String.format("{\"id\":\"%s\",\"patient\":\"%s\",\"doctor\":\"%s\",\"date\":\"%s\",\"time\":\"%s\",\"status\":\"%s\"}",
                id, patientName, doctorName, appointmentDate, appointmentTime, status);
    }

    @Override
    public String toCsvRow() {
        return String.format("%s,%s,%s,%s,%s,%s,%s",
                id, patientId, doctorId, appointmentDate, appointmentTime, department, status);
    }

    @Override
    public String toFormattedSummary() {
        return String.format("Appointment with %s (%s) on %s at %s - Status: %s",
                doctorName, department, appointmentDate, appointmentTime, status.getLabel());
    }

    public static class Builder {
        private String id;
        private String patientId;
        private String patientName;
        private String doctorId;
        private String doctorName;
        private String department;
        private LocalDate appointmentDate;
        private LocalTime appointmentTime;
        private String reason = "General Checkup";
        private AppointmentStatus status = AppointmentStatus.CONFIRMED;
        private String notes = "";
        private String type = "In-Person";

        public Builder id(String id) { this.id = id; return this; }
        public Builder patientId(String patientId) { this.patientId = patientId; return this; }
        public Builder patientName(String patientName) { this.patientName = patientName; return this; }
        public Builder doctorId(String doctorId) { this.doctorId = doctorId; return this; }
        public Builder doctorName(String doctorName) { this.doctorName = doctorName; return this; }
        public Builder department(String department) { this.department = department; return this; }
        public Builder appointmentDate(LocalDate date) { this.appointmentDate = date; return this; }
        public Builder appointmentTime(LocalTime time) { this.appointmentTime = time; return this; }
        public Builder reason(String reason) { this.reason = reason; return this; }
        public Builder status(AppointmentStatus status) { this.status = status; return this; }
        public Builder notes(String notes) { this.notes = notes; return this; }
        public Builder type(String type) { this.type = type; return this; }

        public Appointment build() {
            return new Appointment(this);
        }
    }
}
