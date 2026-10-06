package com.healthone.model.records;

import com.healthone.model.enums.Role;
import java.time.LocalDateTime;

/**
 * Java Record demonstrating immutable data carriers.
 */
public record AuthSession(
        String sessionId,
        String userId,
        String email,
        String fullName,
        Role role,
        String token,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
    public boolean isValid() {
        return expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
    }
}
