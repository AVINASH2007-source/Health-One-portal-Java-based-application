package com.healthone;

import com.healthone.config.ServerConfig;
import com.healthone.concurrency.ThreadManager;
import com.healthone.model.appointment.Appointment;
import com.healthone.model.enums.AppointmentStatus;
import com.healthone.model.enums.BloodGroup;
import com.healthone.model.enums.DepartmentType;
import com.healthone.model.record.LabReportRecord;
import com.healthone.model.record.PrescriptionRecord;
import com.healthone.model.record.VitalsRecord;
import com.healthone.model.user.DoctorUser;
import com.healthone.model.user.PatientUser;
import com.healthone.pattern.observer.AuditLoggingObserver;
import com.healthone.pattern.observer.EmergencyEventPublisher;
import com.healthone.pattern.observer.SmsNotificationObserver;
import com.healthone.repository.*;
import com.healthone.server.HealthOneHttpServer;
import com.healthone.server.HttpHandlerRegistry;
import com.healthone.server.StaticFileHandler;
import com.healthone.service.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Health-One Main Application Entry Point.
 *
 * Demonstrates:
 * 1. Object-Oriented Programming (OOP) - Encapsulation, Inheritance, Polymorphism, Abstraction
 * 2. Java Collections Framework (List, Map, Set, Queue, Concurrent Collections)
 * 3. Java Generics and Type Safety
 * 4. Exception Handling with Custom Hierarchies
 * 5. Concurrency & Multithreading (ExecutorService, CompletableFuture)
 * 6. Java I/O and Modern Streams API
 * 7. Modern Java Features (Records, Pattern Matching, Sealed Interfaces, Text Blocks)
 * 8. Design Patterns (Singleton, Factory, Builder, Strategy, Observer, Repository, Filter Chain)
 */
public class Main {

    public static void main(String[] args) {
        printBanner();

        // 1. Initialize Repositories (Generic Collections DAO Layer)
        PatientRepository patientRepository = new PatientRepository();
        DoctorRepository doctorRepository = new DoctorRepository();
        AppointmentRepository appointmentRepository = new AppointmentRepository();
        MedicalRecordRepository recordRepository = new MedicalRecordRepository();
        AuditLogRepository auditLogRepository = new AuditLogRepository();

        // 2. Initialize Design Pattern: Observer Publisher
        EmergencyEventPublisher emergencyPublisher = new EmergencyEventPublisher();
        emergencyPublisher.subscribe(new SmsNotificationObserver());
        emergencyPublisher.subscribe(new AuditLoggingObserver());

        // 3. Initialize Domain Services
        AuthService authService = new AuthService(patientRepository, doctorRepository);
        PatientService patientService = new PatientService(patientRepository, recordRepository, appointmentRepository);
        DoctorService doctorService = new DoctorService(doctorRepository, patientRepository, appointmentRepository, recordRepository);
        EmergencyService emergencyService = new EmergencyService(patientRepository, recordRepository, auditLogRepository, emergencyPublisher);
        AnalyticsService analyticsService = new AnalyticsService(patientRepository, recordRepository);
        AIProxyService aiProxyService = new AIProxyService();

        // 4. Seed Comprehensive Sample Healthcare Data
        seedData(patientRepository, doctorRepository, appointmentRepository, recordRepository, auditLogRepository);

        // 5. Initialize Embedded Java Server
        ServerConfig config = ServerConfig.getInstance();
        HttpHandlerRegistry apiRegistry = new HttpHandlerRegistry(
                authService, patientService, doctorService,
                emergencyService, analyticsService, aiProxyService
        );
        StaticFileHandler staticFileHandler = new StaticFileHandler(config.getWebStaticDir());
        HealthOneHttpServer server = new HealthOneHttpServer(config, apiRegistry, staticFileHandler);

        try {
            server.start();
            System.out.println("================================================================================");
            System.out.println(" ✅ Health-One Java Application Server Started Successfully!");
            System.out.println(" 🌐 Web Portal & Full App URL: http://localhost:" + config.getPort() + "/");
            System.out.println(" 🩺 Patient Dashboard:         http://localhost:" + config.getPort() + "/patient");
            System.out.println(" 👨‍⚕️ Doctor Dashboard:          http://localhost:" + config.getPort() + "/doctor");
            System.out.println(" 🚨 Emergency QR Flow:         http://localhost:" + config.getPort() + "/emergency/P-8821");
            System.out.println(" 📊 REST API Health Probe:     http://localhost:" + config.getPort() + "/api/health");
            System.out.println("================================================================================");
            System.out.println(" 💡 Press CTRL+C in this terminal window to gracefully stop the Java server.\n");

            // Attach JVM Graceful Shutdown Hook
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                System.out.println("\n[Shutdown] Stopping Health-One Java HTTP Server...");
                server.stop();
                ThreadManager.getInstance().shutdown();
                System.out.println("[Shutdown] Server stopped gracefully. Goodbye!");
            }));

        } catch (Exception e) {
            System.err.println("❌ Failed to start Health-One Server: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private static void printBanner() {
        System.out.println("""
            ================================================================================
             __  __               _   _          ____                  
            |  \\/  |  ___   __ _ (_) | |_  ___  |  _ \\  ___   _ __ ___ 
            | |\\/| | / _ \\ / _` || | | __|/ _ \\ | |_) |/ _ \\ | '__/ _ \\
            | |  | ||  __/| (_| || | | |_|  __/ |  __/| (_) || | |  __/
            |_|  |_| \\___| \\__,_||_|  \\__|\\___| |_|    \\___/ |_|  \\___|
                         HEALTH-ONE LIFETIME DIGITAL HEALTH PORTAL
                          [ Core Java Enterprise Architecture ]
            ================================================================================
            Java Runtime : %s (%s)
            Architecture : OOP | Concurrency | Streams | Generics | Observer & Strategy Patterns
            Web Server   : Java SE Embedded HTTP Server (Port 8080) + React Single-Page App
            ================================================================================
            """.formatted(System.getProperty("java.version"), System.getProperty("java.vendor")));
    }

    private static void seedData(PatientRepository patientRepo,
                                 DoctorRepository doctorRepo,
                                 AppointmentRepository appointmentRepo,
                                 MedicalRecordRepository recordRepo,
                                 AuditLogRepository auditRepo) {

        // Seed Patient (Builder Pattern)
        PatientUser patient = PatientUser.builder()
                .id("P-8821")
                .email("patient@healthone.org")
                .passwordHash("password123")
                .fullName("Alex Morgan")
                .phone("+1 (555) 234-5678")
                .patientNumber("P-8821")
                .dateOfBirth(LocalDate.of(1991, 5, 14))
                .gender("Male")
                .bloodGroup(BloodGroup.O_POSITIVE)
                .heightCm(182.0)
                .weightKg(78.5)
                .emergencyContactName("Elena Morgan")
                .emergencyContactPhone("+1 (555) 876-5432")
                .emergencyContactRelation("Spouse")
                .organDonorStatus("Registered Donor (UNOS #88219)")
                .allergies(List.of("Penicillin (Anaphylaxis)", "Peanuts (Mild)"))
                .chronicConditions(List.of("Asthma (Mild Persistent)", "Stage 1 Hypertension"))
                .activeMedications(List.of("Lisinopril 10mg Daily", "Albuterol Inhaler (PRN)", "Atorvastatin 20mg"))
                .primaryPhysician("Dr. Sarah Jenkins, MD")
                .preferredLanguage("English (US)")
                .build();
        patientRepo.save(patient);

        // Seed Doctors
        DoctorUser doc1 = new DoctorUser(
                "DOC-01",
                "doctor@healthone.org",
                "doctor123",
                "Dr. Sarah Jenkins",
                "+1 (555) 432-8765",
                "MD-88392-CA",
                "Chief of Cardiology",
                DepartmentType.CARDIOLOGY,
                "Health-One Metro Hospital",
                14,
                4.9
        );
        DoctorUser doc2 = new DoctorUser(
                "DOC-02",
                "neurologist@healthone.org",
                "doctor123",
                "Dr. Marcus Vance",
                "+1 (555) 321-9876",
                "MD-55219-CA",
                "Senior Neurologist",
                DepartmentType.NEUROLOGY,
                "Health-One Metro Hospital",
                18,
                4.95
        );
        doctorRepo.save(doc1);
        doctorRepo.save(doc2);

        // Seed Medical Records (Polymorphic: Prescription, Lab, Vitals)
        PrescriptionRecord rx1 = new PrescriptionRecord(
                "RX-101", patient.getId(), doc1.getId(), doc1.getFullName(),
                "Health-One Metro Hospital", LocalDate.now().minusDays(15),
                "Cardiology Maintenance Therapy", "Stage 1 Essential Hypertension",
                LocalDate.now().plusMonths(3)
        );
        rx1.addMedication(new PrescriptionRecord.MedicationItem("Lisinopril", "10mg", "Once Daily (Morning)", "90 Days", "Take with food"));
        rx1.addMedication(new PrescriptionRecord.MedicationItem("Atorvastatin", "20mg", "Once Daily (Night)", "90 Days", "Avoid grapefruit juice"));
        recordRepo.save(rx1);

        LabReportRecord lab1 = new LabReportRecord(
                "LAB-201", patient.getId(), doc1.getId(), doc1.getFullName(),
                "Quest Diagnostic Laboratories", LocalDate.now().minusDays(30),
                "Comprehensive Metabolic Panel & Lipid Profile", "Quest Diagnostics Center",
                "Lipid markers well managed under statin therapy."
        );
        lab1.addBiomarker(new LabReportRecord.BiomarkerResult("Total Cholesterol", 178, "mg/dL", "125-200", false));
        lab1.addBiomarker(new LabReportRecord.BiomarkerResult("HDL Cholesterol", 54, "mg/dL", "> 40", false));
        lab1.addBiomarker(new LabReportRecord.BiomarkerResult("LDL Cholesterol", 98, "mg/dL", "< 100", false));
        lab1.addBiomarker(new LabReportRecord.BiomarkerResult("Triglycerides", 130, "mg/dL", "< 150", false));
        lab1.addBiomarker(new LabReportRecord.BiomarkerResult("Fasting Glucose", 94, "mg/dL", "70-99", false));
        recordRepo.save(lab1);

        VitalsRecord vitals1 = new VitalsRecord(
                "VIT-301", patient.getId(), doc1.getId(), doc1.getFullName(),
                "Health-One Metro Hospital", 124, 82, 72, 99, 36.8, 95
        );
        recordRepo.save(vitals1);

        // Seed Appointments
        Appointment app1 = Appointment.builder()
                .id("APP-501")
                .patientId(patient.getId())
                .patientName(patient.getFullName())
                .doctorId(doc1.getId())
                .doctorName(doc1.getFullName())
                .department(DepartmentType.CARDIOLOGY.getTitle())
                .appointmentDate(LocalDate.now().plusDays(5))
                .appointmentTime(LocalTime.of(10, 30))
                .reason("Quarterly Cardiovascular Review & Lipid Panel")
                .status(AppointmentStatus.CONFIRMED)
                .type("In-Person")
                .build();

        Appointment app2 = Appointment.builder()
                .id("APP-502")
                .patientId(patient.getId())
                .patientName(patient.getFullName())
                .doctorId(doc2.getId())
                .doctorName(doc2.getFullName())
                .department(DepartmentType.NEUROLOGY.getTitle())
                .appointmentDate(LocalDate.now().plusDays(18))
                .appointmentTime(LocalTime.of(14, 0))
                .reason("Routine Neurological Checkup")
                .status(AppointmentStatus.PENDING)
                .type("Consultation")
                .build();

        appointmentRepo.save(app1);
        appointmentRepo.save(app2);

        // Seed Initial Audit Logs
        auditRepo.log("SYSTEM_INITIALIZED", "SYSTEM", "KERNEL", "SERVER_CONFIG", "Health-One Core Java subsystem bootstrapped", "127.0.0.1");
        auditRepo.log("PATIENT_RECORD_SYNCHRONIZED", "DOC-01", "DOCTOR", "PATIENT:P-8821", "Prescription & Labs recorded", "127.0.0.1");
    }
}
