package com.healthone.pattern.strategy;

import com.healthone.model.record.MedicalRecord;
import com.healthone.model.user.PatientUser;

import java.util.List;
import java.util.Objects;

/**
 * Context class for the Strategy Pattern.
 * Demonstrates:
 * - Dynamic strategy switching
 * - Strategy delegation
 */
public class RiskEvaluationContext {

    private HealthRiskStrategy strategy;

    public RiskEvaluationContext(HealthRiskStrategy strategy) {
        this.strategy = Objects.requireNonNull(strategy, "Strategy cannot be null");
    }

    public void setStrategy(HealthRiskStrategy strategy) {
        this.strategy = Objects.requireNonNull(strategy, "Strategy cannot be null");
    }

    public int executeEvaluation(PatientUser patient, List<MedicalRecord> records) {
        return strategy.calculateRiskScore(patient, records);
    }
}
