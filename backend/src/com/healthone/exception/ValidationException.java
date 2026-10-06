package com.healthone.exception;

/**
 * Thrown when entity or payload validation fails.
 */
public class ValidationException extends HealthOneException {

    private static final long serialVersionUID = 1L;

    public ValidationException(String message) {
        super(message, "VALIDATION_FAILED", 400);
    }
}
