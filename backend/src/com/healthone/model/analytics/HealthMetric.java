package com.healthone.model.analytics;

import com.healthone.model.common.BaseEntity;

import java.time.LocalDate;

/**
 * Health Metric time-series data point.
 */
public class HealthMetric extends BaseEntity<String> {

    private static final long serialVersionUID = 1L;

    private String patientId;
    private LocalDate recordDate;
    private int heartRate;
    private int systolicBp;
    private int diastolicBp;
    private int bloodSugar;
    private int sleepScore;
    private int dailySteps;
    private double bodyWeight;

    public HealthMetric(String id, String patientId, LocalDate recordDate, int heartRate,
                        int systolicBp, int diastolicBp, int bloodSugar, int sleepScore, int dailySteps, double bodyWeight) {
        super(id, patientId);
        this.patientId = patientId;
        this.recordDate = recordDate;
        this.heartRate = heartRate;
        this.systolicBp = systolicBp;
        this.diastolicBp = diastolicBp;
        this.bloodSugar = bloodSugar;
        this.sleepScore = sleepScore;
        this.dailySteps = dailySteps;
        this.bodyWeight = bodyWeight;
    }

    public String getPatientId() { return patientId; }
    public LocalDate getRecordDate() { return recordDate; }
    public int getHeartRate() { return heartRate; }
    public int getSystolicBp() { return systolicBp; }
    public int getDiastolicBp() { return diastolicBp; }
    public int getBloodSugar() { return bloodSugar; }
    public int getSleepScore() { return sleepScore; }
    public int getDailySteps() { return dailySteps; }
    public double getBodyWeight() { return bodyWeight; }
}
