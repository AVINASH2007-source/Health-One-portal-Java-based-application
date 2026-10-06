package com.healthone.pattern.factory;

import com.healthone.model.enums.EmergencyLevel;
import com.healthone.model.record.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Factory Design Pattern for generating medical records.
 */
public class MedicalRecordFactory {

    public static PrescriptionRecord createPrescription(String patientId, String doctorId, String doctorName,
                                                        String hospitalName, String title, String diagnosis) {
        String id = "RX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return new PrescriptionRecord(id, patientId, doctorId, doctorName, hospitalName, LocalDate.now(), title, diagnosis, LocalDate.now().plusMonths(3));
    }

    public static LabReportRecord createLabReport(String patientId, String doctorId, String doctorName,
                                                  String hospitalName, String title, String laboratoryName, String impression) {
        String id = "LAB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return new LabReportRecord(id, patientId, doctorId, doctorName, hospitalName, LocalDate.now(), title, laboratoryName, impression);
    }

    public static VitalsRecord createVitalsRecord(String patientId, String doctorId, String doctorName,
                                                  String hospitalName, int systolic, int diastolic, int hr, int spo2, double temp, int glucose) {
        String id = "VIT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return new VitalsRecord(id, patientId, doctorId, doctorName, hospitalName, systolic, diastolic, hr, spo2, temp, glucose);
    }

    public static EmergencyAccessLog createEmergencyAccessLog(String patientId, String responderLicense,
                                                              String doctorName, String reason, String hospitalName, EmergencyLevel level) {
        String id = "EMG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return new EmergencyAccessLog(id, patientId, responderLicense, doctorName, reason, hospitalName, level, true);
    }
}
