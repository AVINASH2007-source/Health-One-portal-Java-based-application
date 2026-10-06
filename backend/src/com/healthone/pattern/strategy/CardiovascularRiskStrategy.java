package com.healthone.pattern.strategy;

import com.healthone.model.record.MedicalRecord;
import com.healthone.model.record.VitalsRecord;
import com.healthone.model.user.PatientUser;

import java.util.List;

/**
 * Strategy implementation for cardiovascular risk evaluation.
 * Demonstrates:
 * - Java Streams API
 * - Pattern matching / type checking
 */
public class CardiovascularRiskStrategy implements HealthRiskStrategy {

    @Override
    public int calculateRiskScore(PatientUser patient, List<MedicalRecord> records) {
        int score = 88; // Default good cardiovascular baseline

        // Factor BMI
        double bmi = patient.calculateBmi();
        if (bmi > 30.0) score -= 15;
        else if (bmi > 25.0) score -= 8;

        // Factor Chronic Conditions
        if (patient.getChronicConditions().stream().anyMatch(c -> c.toLowerCase().contains("hypertension"))) {
            score -= 15;
        }

        // Factor latest vitals using Streams
        var latestVitals = records.stream()
                .filter(r -> r instanceof VitalsRecord)
                .map(r -> (VitalsRecord) r)
                .findFirst();

        if (latestVitals.isPresent()) {
            VitalsRecord v = latestVitals.get();
            if (v.getSystolicBp() > 140) score -= 12;
            if (v.getHeartRateBpm() > 100 || v.getHeartRateBpm() < 55) score -= 8;
        }

        return Math.max(20, Math.min(100, score));
    }
}
