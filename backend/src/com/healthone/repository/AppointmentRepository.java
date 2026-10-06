package com.healthone.repository;

import com.healthone.model.appointment.Appointment;
import com.healthone.model.enums.AppointmentStatus;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Repository for Appointments.
 * Demonstrates:
 * - Complex stream pipelines
 * - Comparator sorting
 */
public class AppointmentRepository extends AbstractInMemoryRepository<Appointment, String> {

    public List<Appointment> findByPatientId(String patientId) {
        return storage.values().stream()
                .filter(a -> a.getPatientId().equalsIgnoreCase(patientId))
                .sorted(Comparator.comparing(Appointment::getAppointmentDate)
                        .thenComparing(Appointment::getAppointmentTime))
                .collect(Collectors.toList());
    }

    public List<Appointment> findByDoctorId(String doctorId) {
        return storage.values().stream()
                .filter(a -> a.getDoctorId().equalsIgnoreCase(doctorId))
                .sorted(Comparator.comparing(Appointment::getAppointmentDate)
                        .thenComparing(Appointment::getAppointmentTime))
                .collect(Collectors.toList());
    }

    public List<Appointment> findUpcomingByPatient(String patientId) {
        LocalDate today = LocalDate.now();
        return storage.values().stream()
                .filter(a -> a.getPatientId().equalsIgnoreCase(patientId))
                .filter(a -> !a.getAppointmentDate().isBefore(today))
                .filter(a -> a.getStatus() == AppointmentStatus.CONFIRMED || a.getStatus() == AppointmentStatus.PENDING)
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .collect(Collectors.toList());
    }
}
