package com.healthone.exception;

/**
 * Thrown when an unauthenticated or unauthorized access attempt occurs.
 */
public class UnauthorizedAccessException extends HealthOneException {

    private static final long serialVersionUID = 1L;

    public UnauthorizedAccessException(String message) {
        super(message, "UNAUTHORIZED_ACCESS", 401);
    }

    public UnauthorizedAccessException(String message, boolean forbidden) {
        super(message, forbidden ? "FORBIDDEN" : "UNAUTHORIZED_ACCESS", forbidden ? 403 : 401);
    }
}
