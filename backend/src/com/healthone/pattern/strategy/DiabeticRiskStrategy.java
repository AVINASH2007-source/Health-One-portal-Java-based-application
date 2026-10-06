package com.healthone.pattern.strategy;

import com.healthone.model.record.MedicalRecord;
import com.healthone.model.record.VitalsRecord;
import com.healthone.model.user.PatientUser;

import java.util.List;

/**
 * Strategy implementation for diabetes and glycemic control scoring.
 */
public class DiabeticRiskStrategy implements HealthRiskStrategy {

    @Override
    public int calculateRiskScore(PatientUser patient, List<MedicalRecord> records) {
        int score = 92;

        if (patient.getChronicConditions().stream().anyMatch(c -> c.toLowerCase().contains("diabetes"))) {
            score -= 20;
        }

        var latestVitals = records.stream()
                .filter(r -> r instanceof VitalsRecord)
                .map(r -> (VitalsRecord) r)
                .findFirst();

        if (latestVitals.isPresent()) {
            VitalsRecord v = latestVitals.get();
            if (v.getBloodGlucoseMgDl() > 140) score -= 15;
            else if (v.getBloodGlucoseMgDl() > 110) score -= 5;
        }

        return Math.max(20, Math.min(100, score));
    }
}
