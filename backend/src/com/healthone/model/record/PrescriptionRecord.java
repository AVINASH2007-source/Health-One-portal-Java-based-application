package com.healthone.model.record;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Prescription Record entity.
 * Demonstrates:
 * - Polymorphic inheritance
 * - Inner domain classes
 * - Encapsulation
 */
public class PrescriptionRecord extends MedicalRecord {

    private static final long serialVersionUID = 1L;

    public static class MedicationItem {
        private final String name;
        private final String dosage;
        private final String frequency;
        private final String duration;
        private final String instructions;

        public MedicationItem(String name, String dosage, String frequency, String duration, String instructions) {
            this.name = name;
            this.dosage = dosage;
            this.frequency = frequency;
            this.duration = duration;
            this.instructions = instructions;
        }

        public String getName() { return name; }
        public String getDosage() { return dosage; }
        public String getFrequency() { return frequency; }
        public String getDuration() { return duration; }
        public String getInstructions() { return instructions; }
    }

    private List<MedicationItem> medications;
    private String diagnosis;
    private boolean active;
    private LocalDate validUntil;

    public PrescriptionRecord(String id, String patientId, String doctorId, String doctorName,
                              String hospitalName, LocalDate recordDate, String title, String diagnosis,
                              LocalDate validUntil) {
        super(id, patientId, doctorId, doctorName, hospitalName, recordDate, title, "Prescription", "Active Rx");
        this.diagnosis = diagnosis;
        this.validUntil = validUntil != null ? validUntil : recordDate.plusMonths(3);
        this.active = this.validUntil.isAfter(LocalDate.now());
        this.medications = new ArrayList<>();
    }

    public List<MedicationItem> getMedications() { return Collections.unmodifiableList(medications); }
    public void addMedication(MedicationItem item) { if (item != null) this.medications.add(item); }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDate getValidUntil() { return validUntil; }
    public void setValidUntil(LocalDate validUntil) { this.validUntil = validUntil; }

    @Override
    public String getStatusBadge() {
        return active ? "ACTIVE_RX" : "EXPIRED_RX";
    }

    @Override
    public String formatRecord() {
        return String.format("Prescription for %s: %d meds prescribed by %s (Valid until %s)",
                diagnosis, medications.size(), doctorName, validUntil);
    }
}
