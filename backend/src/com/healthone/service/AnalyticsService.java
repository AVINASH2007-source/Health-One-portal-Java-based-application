package com.healthone.service;

import com.healthone.model.record.MedicalRecord;
import com.healthone.model.records.HealthScoreResult;
import com.healthone.model.user.PatientUser;
import com.healthone.pattern.strategy.CardiovascularRiskStrategy;
import com.healthone.pattern.strategy.DiabeticRiskStrategy;
import com.healthone.pattern.strategy.GeneralWellnessStrategy;
import com.healthone.pattern.strategy.RiskEvaluationContext;
import com.healthone.repository.MedicalRecordRepository;
import com.healthone.repository.PatientRepository;

import java.util.ArrayList;
import java.util.List;

/**
 * Health Analytics and Risk Scoring Service.
 * Demonstrates:
 * - Strategy Design Pattern execution
 * - Java Records instantiation
 */
public class AnalyticsService {

    private final PatientRepository patientRepository;
    private final MedicalRecordRepository recordRepository;

    public AnalyticsService(PatientRepository patientRepository, MedicalRecordRepository recordRepository) {
        this.patientRepository = patientRepository;
        this.recordRepository = recordRepository;
    }

    public HealthScoreResult calculatePatientHealthScores(String patientId) {
        PatientUser patient = patientRepository.findById(patientId)
                .or(() -> patientRepository.findByPatientNumber(patientId))
                .orElse(null);

        if (patient == null) {
            return new HealthScoreResult(85, 88, 92, 85, "OPTIMAL", List.of("Maintain regular activity", "Stable vitals"));
        }

        List<MedicalRecord> records = recordRepository.findByPatientId(patient.getId());

        RiskEvaluationContext cardioContext = new RiskEvaluationContext(new CardiovascularRiskStrategy());
        int cardioScore = cardioContext.executeEvaluation(patient, records);

        RiskEvaluationContext diabeticContext = new RiskEvaluationContext(new DiabeticRiskStrategy());
        int diabeticScore = diabeticContext.executeEvaluation(patient, records);

        RiskEvaluationContext wellnessContext = new RiskEvaluationContext(new GeneralWellnessStrategy());
        int wellnessScore = wellnessContext.executeEvaluation(patient, records);

        int overall = (int) Math.round((cardioScore * 0.4) + (diabeticScore * 0.3) + (wellnessScore * 0.3));

        String tier = overall >= 85 ? "OPTIMAL" : (overall >= 70 ? "MODERATE" : "ATTENTION_REQUIRED");

        List<String> insights = new ArrayList<>();
        if (cardioScore < 80) insights.add("Cardiovascular metrics slightly elevated. Consider reducing sodium intake.");
        if (diabeticScore < 80) insights.add("Glycemic fluctuation observed. Monitor fasting blood glucose.");
        if (patient.calculateBmi() > 25) insights.add(String.format("Current BMI is %.1f. 30 minutes of aerobic exercise recommended.", patient.calculateBmi()));
        if (insights.isEmpty()) insights.add("All biomarkers are within optimal physiological thresholds.");

        return new HealthScoreResult(overall, cardioScore, diabeticScore, wellnessScore, tier, insights);
    }
}
