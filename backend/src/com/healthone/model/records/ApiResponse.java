package com.healthone.model.records;

import java.time.Instant;

/**
 * Generic API response record demonstrating Generics in Java Records.
 *
 * @param <T> Payload data type
 */
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        String timestamp,
        int statusCode
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, "Success", data, Instant.now().toString(), 200);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, Instant.now().toString(), 200);
    }

    public static <T> ApiResponse<T> error(String message, int statusCode) {
        return new ApiResponse<>(false, message, null, Instant.now().toString(), statusCode);
    }
}
