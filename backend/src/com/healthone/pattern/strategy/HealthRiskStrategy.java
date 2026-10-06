package com.healthone.pattern.strategy;

import com.healthone.model.user.PatientUser;
import com.healthone.model.record.MedicalRecord;
import java.util.List;

/**
 * Strategy interface for calculating specialized patient health risk scores.
 * Demonstrates:
 * - Strategy Design Pattern
 * - Functional / Polymorphic evaluation
 */
@FunctionalInterface
public interface HealthRiskStrategy {
    int calculateRiskScore(PatientUser patient, List<MedicalRecord> records);
}
