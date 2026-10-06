package com.healthone.repository;

import com.healthone.model.common.Identifiable;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Collectors;

/**
 * High-throughput thread-safe repository for HIPAA audit logs using ConcurrentLinkedQueue.
 * Demonstrates:
 * - Java Queue Collection (ConcurrentLinkedQueue)
 * - Thread-safe logging
 */
public class AuditLogRepository {

    public static class AuditEntry implements Identifiable<String>, Serializable {
        private static final long serialVersionUID = 1L;

        private final String id;
        private final String action;
        private final String performedBy;
        private final String role;
        private final String targetEntity;
        private final String details;
        private final LocalDateTime timestamp;
        private final String ipAddress;

        public AuditEntry(String id, String action, String performedBy, String role,
                          String targetEntity, String details, String ipAddress) {
            this.id = id;
            this.action = action;
            this.performedBy = performedBy;
            this.role = role;
            this.targetEntity = targetEntity;
            this.details = details;
            this.timestamp = LocalDateTime.now();
            this.ipAddress = ipAddress;
        }

        @Override public String getId() { return id; }
        public String getAction() { return action; }
        public String getPerformedBy() { return performedBy; }
        public String getRole() { return role; }
        public String getTargetEntity() { return targetEntity; }
        public String getDetails() { return details; }
        public LocalDateTime getTimestamp() { return timestamp; }
        public String getIpAddress() { return ipAddress; }
    }

    private final Queue<AuditEntry> auditQueue = new ConcurrentLinkedQueue<>();

    public void log(String action, String performedBy, String role, String targetEntity, String details, String ip) {
        String id = "AUD-" + System.currentTimeMillis() + "-" + (auditQueue.size() + 1);
        auditQueue.add(new AuditEntry(id, action, performedBy, role, targetEntity, details, ip));
    }

    public List<AuditEntry> getRecentLogs(int limit) {
        return auditQueue.stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    public List<AuditEntry> getAllLogs() {
        return new ArrayList<>(auditQueue);
    }
}
