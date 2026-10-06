package com.healthone.io;

import com.healthone.model.common.Exportable;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Utility for exporting domain entities.
 * Demonstrates:
 * - Streams API reduction and collecting
 * - Generics
 */
public class DataExporter {

    public static <T extends Exportable> String exportToCsv(String header, List<T> items) {
        StringBuilder csv = new StringBuilder();
        csv.append(header).append("\n");
        String rows = items.stream()
                .map(Exportable::toCsvRow)
                .collect(Collectors.joining("\n"));
        csv.append(rows);
        return csv.toString();
    }

    public static <T extends Exportable> String exportSummary(String title, List<T> items) {
        StringBuilder summary = new StringBuilder();
        summary.append("=========================================\n");
        summary.append(" ").append(title.toUpperCase()).append("\n");
        summary.append("=========================================\n");
        items.forEach(item -> summary.append(" • ").append(item.toFormattedSummary()).append("\n"));
        summary.append("=========================================\n");
        summary.append("Total records: ").append(items.size()).append("\n");
        return summary.toString();
    }
}
