package com.healthone.model.records;

import java.time.LocalDateTime;

/**
 * Java Record for discrete vital measurement.
 */
public record VitalReading(
        String metricName,
        double value,
        String unit,
        boolean inNormalRange,
        LocalDateTime recordedAt
) {
    public String formatted() {
        return String.format("%.1f %s (%s)", value, unit, inNormalRange ? "Normal" : "Flagged");
    }
}
