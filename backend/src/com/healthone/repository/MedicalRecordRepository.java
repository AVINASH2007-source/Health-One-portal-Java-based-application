package com.healthone.repository;

import com.healthone.model.record.MedicalRecord;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Repository for Medical Records.
 * Demonstrates:
 * - Polymorphic type filtering using Generics (<R extends MedicalRecord>)
 */
public class MedicalRecordRepository extends AbstractInMemoryRepository<MedicalRecord, String> {

    public List<MedicalRecord> findByPatientId(String patientId) {
        return storage.values().stream()
                .filter(r -> r.getPatientId().equalsIgnoreCase(patientId))
                .sorted(Comparator.comparing(MedicalRecord::getRecordDate).reversed())
                .collect(Collectors.toList());
    }

    public <R extends MedicalRecord> List<R> findByPatientIdAndType(String patientId, Class<R> recordType) {
        return storage.values().stream()
                .filter(r -> r.getPatientId().equalsIgnoreCase(patientId))
                .filter(recordType::isInstance)
                .map(recordType::cast)
                .sorted(Comparator.comparing(MedicalRecord::getRecordDate).reversed())
                .collect(Collectors.toList());
    }
}
