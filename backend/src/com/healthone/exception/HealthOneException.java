package com.healthone.exception;

/**
 * Base unchecked runtime exception for the Health-One system.
 * Demonstrates:
 * - Custom exception hierarchy
 * - Error code mapping
 */
public class HealthOneException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final String errorCode;
    private final int httpStatus;

    public HealthOneException(String message) {
        super(message);
        this.errorCode = "HEALTH_ONE_ERROR";
        this.httpStatus = 500;
    }

    public HealthOneException(String message, String errorCode, int httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public HealthOneException(String message, Throwable cause, String errorCode, int httpStatus) {
        super(message, cause);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
