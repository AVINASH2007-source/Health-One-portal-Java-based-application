package com.healthone.server;

import com.healthone.exception.HealthOneException;
import com.healthone.model.enums.DepartmentType;
import com.healthone.model.enums.Role;
import com.healthone.model.records.ApiResponse;
import com.healthone.model.records.AuthSession;
import com.healthone.model.record.MedicalRecord;
import com.healthone.model.record.PrescriptionRecord;
import com.healthone.pattern.factory.MedicalRecordFactory;
import com.healthone.service.*;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

/**
 * Central API Router dispatching requests to services with standardized JSON responses.
 * Demonstrates:
 * - Lambda handlers
 * - Try-with-resources
 * - Exception translation
 * - Generic API response wrapping
 */
public class HttpHandlerRegistry implements HttpHandler {

    private final AuthService authService;
    private final PatientService patientService;
    private final DoctorService doctorService;
    private final EmergencyService emergencyService;
    private final AnalyticsService analyticsService;
    private final AIProxyService aiProxyService;

    public HttpHandlerRegistry(AuthService authService,
                               PatientService patientService,
                               DoctorService doctorService,
                               EmergencyService emergencyService,
                               AnalyticsService analyticsService,
                               AIProxyService aiProxyService) {
        this.authService = authService;
        this.patientService = patientService;
        this.doctorService = doctorService;
        this.emergencyService = emergencyService;
        this.analyticsService = analyticsService;
        this.aiProxyService = aiProxyService;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod().toUpperCase();
        String path = exchange.getRequestURI().getPath();

        try {
            if (path.equals("/api/health")) {
                handleHealth(exchange);
            } else if (path.equals("/api/auth/login") && method.equals("POST")) {
                handleLogin(exchange);
            } else if (path.equals("/api/auth/register") && method.equals("POST")) {
                handleRegister(exchange);
            } else if (path.equals("/api/auth/session")) {
                handleSession(exchange);
            } else if (path.startsWith("/api/patients")) {
                handlePatients(exchange, method, path);
            } else if (path.startsWith("/api/doctors")) {
                handleDoctors(exchange, method, path);
            } else if (path.startsWith("/api/emergency")) {
                handleEmergency(exchange, method, path);
            } else if (path.startsWith("/api/ai")) {
                handleAI(exchange, method, path);
            } else {
                sendJsonResponse(exchange, 404, ApiResponse.error("API endpoint not found: " + path, 404));
            }
        } catch (HealthOneException e) {
            sendJsonResponse(exchange, e.getHttpStatus(), ApiResponse.error(e.getMessage(), e.getHttpStatus()));
        } catch (Exception e) {
            e.printStackTrace();
            sendJsonResponse(exchange, 500, ApiResponse.error("Internal Server Error: " + e.getMessage(), 500));
        }
    }

    private void handleHealth(HttpExchange exchange) throws IOException {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("runtime", "Java SE " + System.getProperty("java.version"));
        health.put("availableProcessors", Runtime.getRuntime().availableProcessors());
        health.put("freeMemoryMb", Runtime.getRuntime().freeMemory() / (1024 * 1024));
        health.put("totalMemoryMb", Runtime.getRuntime().totalMemory() / (1024 * 1024));
        health.put("portalStatus", "All Micro-Services Operational");
        sendJsonResponse(exchange, 200, ApiResponse.ok(health));
    }

    private void handleLogin(HttpExchange exchange) throws IOException {
        String body = readRequestBody(exchange);
        Map<String, String> payload = JsonUtil.parseSimpleJson(body);
        String email = payload.get("email");
        String password = payload.get("password");
        String roleStr = payload.getOrDefault("role", "PATIENT");
        Role role = Role.fromString(roleStr);

        AuthSession session = authService.login(email, password, role);
        sendJsonResponse(exchange, 200, ApiResponse.ok("Login successful", session));
    }

    private void handleRegister(HttpExchange exchange) throws IOException {
        String body = readRequestBody(exchange);
        Map<String, String> payload = JsonUtil.parseSimpleJson(body);
        String email = payload.get("email");
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String phone = payload.get("phone");
        String roleStr = payload.getOrDefault("role", "PATIENT");
        Role role = Role.fromString(roleStr);

        AuthSession session = authService.register(role, email, password, fullName, phone);
        sendJsonResponse(exchange, 201, ApiResponse.ok("Registration successful", session));
    }

    private void handleSession(HttpExchange exchange) throws IOException {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        String token = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7)
                : null;

        Optional<AuthSession> session = authService.validateSession(token);
        if (session.isPresent()) {
            sendJsonResponse(exchange, 200, ApiResponse.ok(session.get()));
        } else {
            sendJsonResponse(exchange, 401, ApiResponse.error("Session expired or invalid", 401));
        }
    }

    private void handlePatients(HttpExchange exchange, String method, String path) throws IOException {
        String[] parts = path.split("/");
        if (parts.length == 3) {
            // /api/patients
            String query = getQueryParam(exchange, "q");
            sendJsonResponse(exchange, 200, ApiResponse.ok(doctorService.searchPatients(query)));
            return;
        }

        String patientId = parts[3];
        if (parts.length == 4) {
            // /api/patients/{id}
            sendJsonResponse(exchange, 200, ApiResponse.ok(patientService.getPatientById(patientId)));
        } else if (parts.length == 5) {
            String subResource = parts[4];
            switch (subResource) {
                case "timeline" -> sendJsonResponse(exchange, 200, ApiResponse.ok(patientService.getPatientTimeline(patientId)));
                case "records" -> sendJsonResponse(exchange, 200, ApiResponse.ok(patientService.getRecordsGroupedByCategory(patientId)));
                case "medications" -> sendJsonResponse(exchange, 200, ApiResponse.ok(patientService.getActivePrescriptions(patientId)));
                case "analytics" -> sendJsonResponse(exchange, 200, ApiResponse.ok(analyticsService.calculatePatientHealthScores(patientId)));
                case "appointments" -> sendJsonResponse(exchange, 200, ApiResponse.ok(patientService.getPatientAppointments(patientId)));
                default -> sendJsonResponse(exchange, 404, ApiResponse.error("Unknown patient resource: " + subResource, 404));
            }
        }
    }

    private void handleDoctors(HttpExchange exchange, String method, String path) throws IOException {
        if (path.equals("/api/doctors")) {
            sendJsonResponse(exchange, 200, ApiResponse.ok(doctorService.getAllDoctors()));
        } else if (path.equals("/api/doctors/new-entry") && method.equals("POST")) {
            String body = readRequestBody(exchange);
            Map<String, String> payload = JsonUtil.parseSimpleJson(body);
            String patientId = payload.getOrDefault("patientId", "P-8821");
            String doctorName = payload.getOrDefault("doctorName", "Dr. Sarah Jenkins");
            String title = payload.getOrDefault("title", "Clinical Assessment");
            String diagnosis = payload.getOrDefault("diagnosis", "Routine Evaluation");

            PrescriptionRecord rx = MedicalRecordFactory.createPrescription(
                    patientId, "DOC-01", doctorName, "Health-One Metro Hospital", title, diagnosis
            );
            MedicalRecord saved = doctorService.addNewMedicalEntry(rx);
            sendJsonResponse(exchange, 201, ApiResponse.ok("Medical entry added successfully", saved));
        } else if (path.startsWith("/api/doctors/appointments")) {
            sendJsonResponse(exchange, 200, ApiResponse.ok(doctorService.getTodayAppointments("DOC-01")));
        } else {
            sendJsonResponse(exchange, 200, ApiResponse.ok(doctorService.getAllDoctors()));
        }
    }

    private static final Map<String, List<Long>> IP_REQUEST_TIMES = new java.util.concurrent.ConcurrentHashMap<>();
    private static final int MAX_EMERGENCY_REQUESTS_PER_MINUTE = 30;

    private boolean isRateLimited(String clientIp) {
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L;
        List<Long> times = IP_REQUEST_TIMES.computeIfAbsent(clientIp, k -> new java.util.concurrent.CopyOnWriteArrayList<>());
        times.removeIf(t -> t < windowStart);
        if (times.size() >= MAX_EMERGENCY_REQUESTS_PER_MINUTE) {
            return true;
        }
        times.add(now);
        return false;
    }

    private void handleEmergency(HttpExchange exchange, String method, String path) throws IOException {
        String clientIp = exchange.getRemoteAddress().getAddress().getHostAddress();
        String userAgent = exchange.getRequestHeaders().getFirst("User-Agent");

        if (isRateLimited(clientIp)) {
            sendJsonResponse(exchange, 429, ApiResponse.error("Too Many Requests. Rate limit exceeded (Max 30 req/min).", 429));
            return;
        }

        if (method.equals("POST") || path.contains("/verify")) {
            String body = readRequestBody(exchange);
            Map<String, String> payload = JsonUtil.parseSimpleJson(body);
            String patientId = payload.getOrDefault("patientId", "P-8821");
            String license = payload.getOrDefault("license", "MD-99412-EMR");
            String doctorName = payload.getOrDefault("doctorName", "Emergency Response Team");
            String reason = payload.getOrDefault("reason", "Critical Inbound Triage");

            Map<String, Object> result = emergencyService.verifyAndGrantEmergencyAccess(patientId, license, doctorName, "Metro General Trauma", reason);
            sendJsonResponse(exchange, 200, ApiResponse.ok("Emergency Override Authorized", result));
        } else if (method.equals("GET")) {
            // GET /api/emergency/{token} - Public endpoint without JWT, strictly emergency data
            String token = path.substring(path.lastIndexOf('/') + 1).trim();
            if (token.isEmpty() || token.equals("emergency")) {
                sendJsonResponse(exchange, 404, ApiResponse.error("Emergency token not specified or revoked.", 404));
                return;
            }

            try {
                Map<String, Object> result = emergencyService.getPublicEmergencyData(token, clientIp, userAgent);
                sendJsonResponse(exchange, 200, ApiResponse.ok("Emergency Access Granted", result));
            } catch (com.healthone.exception.EntityNotFoundException ex) {
                sendJsonResponse(exchange, 404, ApiResponse.error("Emergency token invalid, expired, or revoked.", 404));
            }
        } else {
            sendJsonResponse(exchange, 405, ApiResponse.error("Method Not Allowed", 405));
        }
    }

    private void handleAI(HttpExchange exchange, String method, String path) throws IOException {
        if (path.endsWith("/summarize")) {
            sendJsonResponse(exchange, 200, ApiResponse.ok(aiProxyService.generateClinicalSummary("P-8821", "Patient report notes", List.of("Lisinopril", "Metformin"))));
        } else if (path.endsWith("/interactions")) {
            sendJsonResponse(exchange, 200, ApiResponse.ok(aiProxyService.checkDrugInteractions(List.of("Lisinopril", "Metformin", "Atorvastatin"))));
        } else {
            sendJsonResponse(exchange, 200, ApiResponse.ok(aiProxyService.generateClinicalSummary("P-8821", "", List.of())));
        }
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, Object body) throws IOException {
        String json = JsonUtil.toJson(body);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[1024];
            int length;
            while ((length = is.read(buffer)) != -1) {
                baos.write(buffer, 0, length);
            }
            return baos.toString(StandardCharsets.UTF_8);
        }
    }

    private String getQueryParam(HttpExchange exchange, String key) {
        String query = exchange.getRequestURI().getQuery();
        if (query == null || query.isBlank()) return null;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=");
            if (kv.length == 2 && kv[0].equalsIgnoreCase(key)) {
                return kv[1];
            }
        }
        return null;
    }
}
