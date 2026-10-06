package com.healthone.model.record;

import com.healthone.model.enums.EmergencyLevel;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Emergency Access Log record.
 * Demonstrates:
 * - Audit recording
 * - Polymorphic behavior
 */
public class EmergencyAccessLog extends MedicalRecord {

    private static final long serialVersionUID = 1L;

    private String responderLicense;
    private String responderRole;
    private String accessReason;
    private String locationIp;
    private LocalDateTime accessedAt;
    private EmergencyLevel triageLevel;
    private boolean accessGranted;

    public EmergencyAccessLog(String id, String patientId, String responderLicense, String doctorName,
                              String accessReason, String hospitalName, EmergencyLevel triageLevel, boolean accessGranted) {
        super(id, patientId, responderLicense, doctorName, hospitalName, LocalDate.now(),
                "Emergency Access Event", "Emergency", accessReason);
        this.responderLicense = responderLicense;
        this.responderRole = "First Responder / ER Physician";
        this.accessReason = accessReason;
        this.locationIp = "127.0.0.1";
        this.accessedAt = LocalDateTime.now();
        this.triageLevel = triageLevel != null ? triageLevel : EmergencyLevel.HIGH;
        this.accessGranted = accessGranted;
    }

    public String getResponderLicense() { return responderLicense; }
    public String getResponderRole() { return responderRole; }
    public String getAccessReason() { return accessReason; }
    public String getLocationIp() { return locationIp; }
    public LocalDateTime getAccessedAt() { return accessedAt; }
    public EmergencyLevel getTriageLevel() { return triageLevel; }
    public boolean isAccessGranted() { return accessGranted; }

    @Override
    public String getStatusBadge() {
        return accessGranted ? "AUTHORIZED_OVERRIDE" : "DENIED";
    }

    @Override
    public String formatRecord() {
        return String.format("EMERGENCY OVERRIDE by %s (License: %s) at %s - Reason: %s [%s]",
                doctorName, responderLicense, accessedAt, accessReason, triageLevel);
    }
}
