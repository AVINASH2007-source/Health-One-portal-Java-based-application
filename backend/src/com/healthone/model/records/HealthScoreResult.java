package com.healthone.model.records;

import java.util.List;

/**
 * Health Score aggregation record.
 */
public record HealthScoreResult(
        int overallScore,
        int cardiovascularScore,
        int metabolicScore,
        int recoveryScore,
        String riskTier,
        List<String> insights
) {}
