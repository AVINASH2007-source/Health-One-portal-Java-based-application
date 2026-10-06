package com.healthone.pattern.strategy;

import com.healthone.model.record.MedicalRecord;
import com.healthone.model.user.PatientUser;

import java.util.List;

/**
 * General Wellness health score strategy.
 */
public class GeneralWellnessStrategy implements HealthRiskStrategy {

    @Override
    public int calculateRiskScore(PatientUser patient, List<MedicalRecord> records) {
        int base = 85;
        if (patient.getAllergies().size() > 2) base -= 5;
        if (patient.getActiveMedications().size() > 3) base -= 6;
        if (records.size() > 5) base += 5; // Active health engagement
        return Math.max(30, Math.min(100, base));
    }
}
