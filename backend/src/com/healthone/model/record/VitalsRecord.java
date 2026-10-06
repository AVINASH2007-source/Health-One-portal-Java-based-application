package com.healthone.model.record;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Vitals measurement record.
 * Demonstrates:
 * - Direct encapsulation of health metrics
 * - Method overloading
 */
public class VitalsRecord extends MedicalRecord {

    private static final long serialVersionUID = 1L;

    private int systolicBp;
    private int diastolicBp;
    private int heartRateBpm;
    private int spo2Percent;
    private double bodyTempCelsius;
    private int bloodGlucoseMgDl;
    private LocalDateTime timestamp;

    public VitalsRecord(String id, String patientId, String doctorId, String doctorName,
                        String hospitalName, int systolicBp, int diastolicBp,
                        int heartRateBpm, int spo2Percent, double bodyTempCelsius, int bloodGlucoseMgDl) {
        super(id, patientId, doctorId, doctorName, hospitalName, LocalDate.now(), "Vitals Check", "Vitals", "Routine Vitals");
        this.systolicBp = systolicBp;
        this.diastolicBp = diastolicBp;
        this.heartRateBpm = heartRateBpm;
        this.spo2Percent = spo2Percent;
        this.bodyTempCelsius = bodyTempCelsius;
        this.bloodGlucoseMgDl = bloodGlucoseMgDl;
        this.timestamp = LocalDateTime.now();
    }

    public int getSystolicBp() { return systolicBp; }
    public int getDiastolicBp() { return diastolicBp; }
    public int getHeartRateBpm() { return heartRateBpm; }
    public int getSpo2Percent() { return spo2Percent; }
    public double getBodyTempCelsius() { return bodyTempCelsius; }
    public int getBloodGlucoseMgDl() { return bloodGlucoseMgDl; }
    public LocalDateTime getTimestamp() { return timestamp; }

    public String getBloodPressureString() {
        return systolicBp + "/" + diastolicBp + " mmHg";
    }

    @Override
    public String getStatusBadge() {
        if (systolicBp >= 140 || diastolicBp >= 90 || heartRateBpm >= 100 || spo2Percent < 95) {
            return "ELEVATED";
        }
        return "STABLE";
    }

    @Override
    public String formatRecord() {
        return String.format("Vitals: BP %s | HR %d bpm | SpO2 %d%% | Temp %.1f°C",
                getBloodPressureString(), heartRateBpm, spo2Percent, bodyTempCelsius);
    }
}
