package com.healthone.repository;

import com.healthone.model.user.PatientUser;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Specialized Repository for Patient entities.
 * Demonstrates:
 * - Java Streams (filter, map, sorted, anyMatch)
 * - Optional handling
 */
public class PatientRepository extends AbstractInMemoryRepository<PatientUser, String> {

    public Optional<PatientUser> findByEmail(String email) {
        if (email == null) return Optional.empty();
        return storage.values().stream()
                .filter(p -> p.getEmail().equalsIgnoreCase(email.trim()))
                .findFirst();
    }

    public Optional<PatientUser> findByPatientNumber(String patientNumber) {
        if (patientNumber == null) return Optional.empty();
        return storage.values().stream()
                .filter(p -> p.getPatientNumber() != null && p.getPatientNumber().equalsIgnoreCase(patientNumber.trim()))
                .findFirst();
    }

    public List<PatientUser> searchPatients(String query) {
        if (query == null || query.isBlank()) {
            return findAll();
        }
        String q = query.toLowerCase().trim();
        return storage.values().stream()
                .filter(p -> p.getFullName().toLowerCase().contains(q)
                        || (p.getPatientNumber() != null && p.getPatientNumber().toLowerCase().contains(q))
                        || p.getId().toLowerCase().contains(q)
                        || p.getChronicConditions().stream().anyMatch(c -> c.toLowerCase().contains(q))
                        || p.getAllergies().stream().anyMatch(a -> a.toLowerCase().contains(q)))
                .collect(Collectors.toList());
    }
}
