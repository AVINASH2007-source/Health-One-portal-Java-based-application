package com.healthone.model.record;

import com.healthone.model.common.BaseEntity;
import com.healthone.model.common.Exportable;

import java.time.LocalDate;
import java.util.Objects;

/**
 * Abstract class for polymorphic medical records.
 * Demonstrates:
 * - Polymorphism (Subclasses override calculateSeverity() and formatRecord())
 * - Abstraction
 * - Inheritance
 */
public abstract class MedicalRecord extends BaseEntity<String> implements Exportable {

    private static final long serialVersionUID = 1L;

    protected String patientId;
    protected String doctorId;
    protected String doctorName;
    protected String hospitalName;
    protected LocalDate recordDate;
    protected String title;
    protected String category;
    protected String notes;

    protected MedicalRecord() {
        super();
        this.recordDate = LocalDate.now();
    }

    protected MedicalRecord(String id, String patientId, String doctorId, String doctorName,
                            String hospitalName, LocalDate recordDate, String title, String category, String notes) {
        super(id, doctorId);
        this.patientId = Objects.requireNonNull(patientId, "Patient ID cannot be null");
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.hospitalName = hospitalName;
        this.recordDate = recordDate != null ? recordDate : LocalDate.now();
        this.title = title;
        this.category = category;
        this.notes = notes;
    }

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }

    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public LocalDate getRecordDate() { return recordDate; }
    public void setRecordDate(LocalDate recordDate) { this.recordDate = recordDate; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    /**
     * Polymorphic method to get record severity/flag.
     */
    public abstract String getStatusBadge();

    /**
     * Polymorphic method to get structured summary for display.
     */
    public abstract String formatRecord();

    @Override
    public String toJson() {
        return String.format("{\"id\":\"%s\",\"type\":\"%s\",\"title\":\"%s\",\"date\":\"%s\"}",
                id, getClass().getSimpleName(), title, recordDate);
    }

    @Override
    public String toCsvRow() {
        return String.format("%s,%s,%s,%s,%s", id, patientId, title, recordDate, getStatusBadge());
    }

    @Override
    public String toFormattedSummary() {
        return String.format("[%s] %s - %s (%s)", recordDate, title, doctorName, getStatusBadge());
    }
}
