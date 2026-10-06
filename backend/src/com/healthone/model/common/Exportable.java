package com.healthone.model.common;

/**
 * Interface defining contract for entities that can be exported in multiple formats.
 * Demonstrates Abstraction and Polymorphism.
 */
public interface Exportable {
    String toJson();
    String toCsvRow();
    String toFormattedSummary();
}
