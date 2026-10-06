package com.healthone.model.record;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Diagnostic Lab Report Record.
 * Demonstrates:
 * - Map Collections for biomarkers
 * - Polymorphic formatting
 */
public class LabReportRecord extends MedicalRecord {

    private static final long serialVersionUID = 1L;

    public static class BiomarkerResult {
        private final String testName;
        private final double value;
        private final String unit;
        private final String referenceRange;
        private final boolean abnormal;

        public BiomarkerResult(String testName, double value, String unit, String referenceRange, boolean abnormal) {
            this.testName = testName;
            this.value = value;
            this.unit = unit;
            this.referenceRange = referenceRange;
            this.abnormal = abnormal;
        }

        public String getTestName() { return testName; }
        public double getValue() { return value; }
        public String getUnit() { return unit; }
        public String getReferenceRange() { return referenceRange; }
        public boolean isAbnormal() { return abnormal; }
    }

    private String laboratoryName;
    private Map<String, BiomarkerResult> biomarkers;
    private String concludingImpression;
    private boolean requiresDoctorFollowup;

    public LabReportRecord(String id, String patientId, String doctorId, String doctorName,
                           String hospitalName, LocalDate recordDate, String title,
                           String laboratoryName, String concludingImpression) {
        super(id, patientId, doctorId, doctorName, hospitalName, recordDate, title, "Lab Report", concludingImpression);
        this.laboratoryName = laboratoryName;
        this.concludingImpression = concludingImpression;
        this.biomarkers = new HashMap<>();
        this.requiresDoctorFollowup = false;
    }

    public String getLaboratoryName() { return laboratoryName; }
    public void setLaboratoryName(String laboratoryName) { this.laboratoryName = laboratoryName; }

    public Map<String, BiomarkerResult> getBiomarkers() { return biomarkers; }
    public void addBiomarker(BiomarkerResult result) {
        if (result != null) {
            this.biomarkers.put(result.getTestName(), result);
            if (result.isAbnormal()) {
                this.requiresDoctorFollowup = true;
            }
        }
    }

    public String getConcludingImpression() { return concludingImpression; }
    public void setConcludingImpression(String concludingImpression) { this.concludingImpression = concludingImpression; }

    public boolean isRequiresDoctorFollowup() { return requiresDoctorFollowup; }

    @Override
    public String getStatusBadge() {
        return requiresDoctorFollowup ? "ATTENTION_REQUIRED" : "NORMAL";
    }

    @Override
    public String formatRecord() {
        return String.format("Lab Report [%s] from %s: %d tests performed (%s)",
                title, laboratoryName, biomarkers.size(), getStatusBadge());
    }
}
