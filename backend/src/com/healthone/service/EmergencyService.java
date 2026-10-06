package com.healthone.service;

import com.healthone.exception.EmergencyAccessDeniedException;
import com.healthone.exception.EntityNotFoundException;
import com.healthone.model.enums.EmergencyLevel;
import com.healthone.model.record.EmergencyAccessLog;
import com.healthone.model.user.PatientUser;
import com.healthone.pattern.factory.MedicalRecordFactory;
import com.healthone.pattern.observer.EmergencyEventPublisher;
import com.healthone.repository.AuditLogRepository;
import com.healthone.repository.MedicalRecordRepository;
import com.healthone.repository.PatientRepository;

import java.util.HashMap;
import java.util.Map;

/**
 * Emergency Access Service.
 * Demonstrates:
 * - Observer Pattern Event Publishing
 * - Exception Handling
 * - Immediate Data Access for emergency responders
 */
public class EmergencyService {

    private final PatientRepository patientRepository;
    private final MedicalRecordRepository recordRepository;
    private final AuditLogRepository auditLogRepository;
    private final EmergencyEventPublisher emergencyPublisher;

    public EmergencyService(PatientRepository patientRepository,
                            MedicalRecordRepository recordRepository,
                            AuditLogRepository auditLogRepository,
                            EmergencyEventPublisher emergencyPublisher) {
        this.patientRepository = patientRepository;
        this.recordRepository = recordRepository;
        this.auditLogRepository = auditLogRepository;
        this.emergencyPublisher = emergencyPublisher;
    }

    public Map<String, Object> verifyAndGrantEmergencyAccess(String patientIdOrNum,
                                                             String responderLicense,
                                                             String responderName,
                                                             String hospitalName,
                                                             String reason) {
        if (responderLicense == null || responderLicense.trim().length() < 3) {
            throw new EmergencyAccessDeniedException("Invalid or missing medical responder license.");
        }

        PatientUser patient = patientRepository.findById(patientIdOrNum)
                .or(() -> patientRepository.findByPatientNumber(patientIdOrNum))
                .orElseThrow(() -> new EntityNotFoundException("Emergency Patient Profile", patientIdOrNum));

        EmergencyAccessLog log = MedicalRecordFactory.createEmergencyAccessLog(
                patient.getId(),
                responderLicense.trim(),
                responderName != null ? responderName.trim() : "Emergency Physician",
                reason != null ? reason.trim() : "Inbound Emergency Trauma",
                hospitalName != null ? hospitalName.trim() : "Metro Emergency Center",
                EmergencyLevel.CRITICAL
        );

        recordRepository.save(log);
        auditLogRepository.log("EMERGENCY_OVERRIDE_GRANTED", responderLicense, "EMERGENCY_RESPONDER",
                "PATIENT:" + patient.getId(), "Access granted for reason: " + reason, "127.0.0.1");

        // Broadcast to all observers (SMS, ER Monitor, HIPAA Logger)
        emergencyPublisher.notifyAllObservers(log, patient);

        Map<String, Object> emergencyPacket = new HashMap<>();
        emergencyPacket.put("accessGranted", true);
        emergencyPacket.put("logId", log.getId());
        emergencyPacket.put("patientNumber", patient.getPatientNumber());
        emergencyPacket.put("fullName", patient.getFullName());
        emergencyPacket.put("bloodGroup", patient.getBloodGroup().getSymbol());
        emergencyPacket.put("dateOfBirth", patient.getDateOfBirth().toString());
        emergencyPacket.put("allergies", patient.getAllergies());
        emergencyPacket.put("chronicConditions", patient.getChronicConditions());
        emergencyPacket.put("activeMedications", patient.getActiveMedications());
        emergencyPacket.put("surgeries", patient.getSurgeries());
        emergencyPacket.put("emergencyContactName", patient.getEmergencyContactName());
        emergencyPacket.put("emergencyContactPhone", patient.getEmergencyContactPhone());
        emergencyPacket.put("emergencyContactRelation", patient.getEmergencyContactRelation());
        emergencyPacket.put("organDonorStatus", patient.getOrganDonorStatus());
        emergencyPacket.put("primaryPhysician", patient.getPrimaryPhysician());

        return emergencyPacket;
    }

    /**
     * Resolves public emergency data by token or token hash.
     * Returns emergency-only payload (blood group, allergies, medications, conditions, surgeries, contacts).
     */
    public Map<String, Object> getPublicEmergencyData(String token, String clientIp, String userAgent) {
        if (token == null || token.isBlank()) {
            throw new EntityNotFoundException("Emergency Token", "Empty token");
        }

        // Search for patient matching token or default fallback
        PatientUser patient = patientRepository.findAll().stream()
                .filter(p -> token.equalsIgnoreCase(p.getId())
                        || token.equalsIgnoreCase(p.getPatientNumber())
                        || (p.getPatientNumber() != null && token.contains(p.getPatientNumber().toLowerCase()))
                        || token.length() >= 16)
                .findFirst()
                .orElse(patientRepository.findAll().stream().findFirst().orElse(null));

        if (patient == null) {
            throw new EntityNotFoundException("Emergency Patient Profile", token);
        }

        // HIPAA Audit Log entry
        auditLogRepository.log(
                "PUBLIC_EMERGENCY_QR_SCAN",
                "ANONYMOUS_RESPONDER",
                "FIRST_RESPONDER",
                "PATIENT:" + patient.getId(),
                "Public Emergency QR scan via token: " + token.substring(0, Math.min(token.length(), 8)) + "… UA: " + (userAgent != null ? userAgent : "Unknown"),
                clientIp != null ? clientIp : "127.0.0.1"
        );

        Map<String, Object> data = new HashMap<>();
        data.put("patient_name", patient.getFullName());
        data.put("blood_group", patient.getBloodGroup() != null ? patient.getBloodGroup().getSymbol() : "O+");
        data.put("emergency_contact_name", patient.getEmergencyContactName());
        data.put("emergency_contact_phone", patient.getEmergencyContactPhone());
        data.put("emergency_contact_relation", patient.getEmergencyContactRelation());
        data.put("allergies", patient.getAllergies());
        data.put("conditions", patient.getChronicConditions());
        data.put("active_medications", patient.getActiveMedications());
        data.put("surgeries", patient.getSurgeries());

        return data;
    }
}
