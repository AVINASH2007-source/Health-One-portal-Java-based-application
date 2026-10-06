package com.healthone.service;

import com.healthone.exception.EntityNotFoundException;
import com.healthone.model.appointment.Appointment;
import com.healthone.model.record.MedicalRecord;
import com.healthone.model.record.PrescriptionRecord;
import com.healthone.model.user.PatientUser;
import com.healthone.repository.AppointmentRepository;
import com.healthone.repository.MedicalRecordRepository;
import com.healthone.repository.PatientRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Patient Service managing patient dashboards, records, medications, and timeline.
 * Demonstrates:
 * - Streams API (groupingBy, mapping, filtering)
 * - Polymorphic record extraction
 */
public class PatientService {

    private final PatientRepository patientRepository;
    private final MedicalRecordRepository recordRepository;
    private final AppointmentRepository appointmentRepository;

    public PatientService(PatientRepository patientRepository,
                          MedicalRecordRepository recordRepository,
                          AppointmentRepository appointmentRepository) {
        this.patientRepository = patientRepository;
        this.recordRepository = recordRepository;
        this.appointmentRepository = appointmentRepository;
    }

    public PatientUser getPatientById(String id) {
        return patientRepository.findById(id)
                .or(() -> patientRepository.findByPatientNumber(id))
                .orElseThrow(() -> new EntityNotFoundException("Patient", id));
    }

    public List<MedicalRecord> getPatientTimeline(String patientId) {
        getPatientById(patientId); // Ensure exists
        return recordRepository.findByPatientId(patientId);
    }

    public List<PrescriptionRecord> getActivePrescriptions(String patientId) {
        return recordRepository.findByPatientIdAndType(patientId, PrescriptionRecord.class).stream()
                .filter(PrescriptionRecord::isActive)
                .collect(Collectors.toList());
    }

    public List<Appointment> getPatientAppointments(String patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    public Map<String, List<MedicalRecord>> getRecordsGroupedByCategory(String patientId) {
        return recordRepository.findByPatientId(patientId).stream()
                .collect(Collectors.groupingBy(MedicalRecord::getCategory));
    }
}
