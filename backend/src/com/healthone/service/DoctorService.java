package com.healthone.service;

import com.healthone.exception.EntityNotFoundException;
import com.healthone.model.appointment.Appointment;
import com.healthone.model.enums.AppointmentStatus;
import com.healthone.model.record.MedicalRecord;
import com.healthone.model.user.DoctorUser;
import com.healthone.model.user.PatientUser;
import com.healthone.repository.AppointmentRepository;
import com.healthone.repository.DoctorRepository;
import com.healthone.repository.MedicalRecordRepository;
import com.healthone.repository.PatientRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Doctor Service managing patient lookup, schedules, and medical entries.
 */
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository recordRepository;

    public DoctorService(DoctorRepository doctorRepository,
                         PatientRepository patientRepository,
                         AppointmentRepository appointmentRepository,
                         MedicalRecordRepository recordRepository) {
        this.doctorRepository = doctorRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.recordRepository = recordRepository;
    }

    public List<DoctorUser> getAllDoctors() {
        return doctorRepository.findAll();
    }

    public DoctorUser getDoctorById(String id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Doctor", id));
    }

    public List<PatientUser> searchPatients(String query) {
        return patientRepository.searchPatients(query);
    }

    public List<Appointment> getDoctorAppointments(String doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    public List<Appointment> getTodayAppointments(String doctorId) {
        LocalDate today = LocalDate.now();
        return appointmentRepository.findByDoctorId(doctorId).stream()
                .filter(a -> a.getAppointmentDate().equals(today))
                .collect(Collectors.toList());
    }

    public boolean updateAppointmentStatus(String appointmentId, AppointmentStatus status) {
        Appointment app = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new EntityNotFoundException("Appointment", appointmentId));
        boolean updated = app.updateStatus(status);
        if (updated) {
            appointmentRepository.save(app);
        }
        return updated;
    }

    public MedicalRecord addNewMedicalEntry(MedicalRecord record) {
        return recordRepository.save(record);
    }
}
