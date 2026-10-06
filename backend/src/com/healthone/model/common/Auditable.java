package com.healthone.model.common;

import java.time.LocalDateTime;

/**
 * Interface defining audit trail capabilities.
 * Demonstrates Abstraction and Interface Segregation.
 */
public interface Auditable {
    LocalDateTime getCreatedAt();
    LocalDateTime getUpdatedAt();
    String getCreatedBy();
    void setUpdatedAt(LocalDateTime updatedAt);
}
