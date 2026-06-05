-- ================================================================
-- BioTrack Platform — Complete Database Schema & Seed Data
-- MySQL 8.0+  |  Generated: 2026-05-21
-- ================================================================
--
-- DATABASES CREATED (7 total):
--   biotrack_iam            IAM Service          port 8081
--   biotrack_patient        Patient Service      port 8082
--   biotrack_sample         Sample Service       port 8083
--   biotrack_notifications  Notification Service port 8084
--   biotrack_compliance     Compliance Service   port 8085
--   biotrack_protocol       Protocol Service     port 8086
--   biotrack_analytics      Analytics Service    port 8087
--
-- HOW TO RUN:
--   Option A (MySQL CLI):
--     mysql -u root -p < biotrack_all_databases.sql
--
--   Option B (MySQL Workbench):
--     Open this file → Run (Ctrl+Shift+Enter)
--
-- ----------------------------------------------------------------
-- DEFAULT SEED PASSWORD : BioTrack@2024
-- To get the BCrypt hash, run this once in your Spring Boot app:
--   System.out.println(new BCryptPasswordEncoder().encode("BioTrack@2024"));
-- Then replace every <BCRYPT_HASH> below with that output.
-- OR register users via: POST /api/v1/auth/register  (public endpoint)
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  1.  IAM SERVICE  ─  biotrack_iam                          ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_iam
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_iam;

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    user_id   BIGINT       NOT NULL AUTO_INCREMENT,
    name      VARCHAR(255) NOT NULL,
    email     VARCHAR(255) NOT NULL,
    phone     VARCHAR(30),
    role      ENUM(
                  'ADMIN',
                  'CLINICAL_TRIAL_MANAGER',
                  'LAB_TECHNICIAN',
                  'RESEARCH_SCIENTIST',
                  'REGULATORY_OFFICER',
                  'DATA_MANAGER'
              ) NOT NULL,
    status    ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    password  VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role   (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed Users ─────────────────────────────────────────────────
-- Default password for all users : BioTrack@2024
-- IMPORTANT: Replace <BCRYPT_HASH> with the BCrypt-encoded value.
-- Quick generator: https://bcrypt-generator.com  (Rounds = 10)
-- ---------------------------------------------------------------
INSERT INTO users (name, email, phone, role, status, password) VALUES
('Sania Agarwal',    'agarwalsania2004@gmail.com',           '+91-9800000001', 'ADMIN',                  'ACTIVE', '$2a$10$REPLACE_WITH_BCRYPT_HASH_OF_BioTrack@2024'),
('Ayush Ranjan',     'nagikusa050@gmail.com',                '+91-9800000002', 'CLINICAL_TRIAL_MANAGER', 'ACTIVE', '$2a$10$REPLACE_WITH_BCRYPT_HASH_OF_BioTrack@2024'),
('Malhar Khatua',    'mallharkhatua@gmail.com',              '+91-9800000003', 'LAB_TECHNICIAN',         'ACTIVE', '$2a$10$REPLACE_WITH_BCRYPT_HASH_OF_BioTrack@2024'),
('Nikita Chaurasia', 'chaurasianikita984@gmail.com',         '+91-9800000004', 'RESEARCH_SCIENTIST',     'ACTIVE', '$2a$10$REPLACE_WITH_BCRYPT_HASH_OF_BioTrack@2024'),
('Snehitha Ganta',   'snehithapriscillaganta7890@gmail.com', '+91-9800000005', 'REGULATORY_OFFICER',     'ACTIVE', '$2a$10$REPLACE_WITH_BCRYPT_HASH_OF_BioTrack@2024'),
('Prateek Bora',     'prateekbora71@gmail.com',              '+91-9800000006', 'DATA_MANAGER',           'ACTIVE', '$2a$10$REPLACE_WITH_BCRYPT_HASH_OF_BioTrack@2024');


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  2.  PATIENT SERVICE  ─  biotrack_patient                  ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_patient
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_patient;

-- ── patients ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS patient_documents;
DROP TABLE IF EXISTS patients;

CREATE TABLE patients (
    patient_id        BIGINT       NOT NULL AUTO_INCREMENT,
    name              VARCHAR(255) NOT NULL,
    dob               VARCHAR(50)  NOT NULL,          -- stored as String (e.g. "1990-04-15")
    contact_info      VARCHAR(255) NOT NULL,
    enrollment_status ENUM('ENROLLED','WITHDRAWN','COMPLETED','SCREENING') NOT NULL,
    site_id           BIGINT,                          -- cross-service reference
    protocol_id       BIGINT,                          -- cross-service reference
    PRIMARY KEY (patient_id),
    INDEX idx_patients_enrollment (enrollment_status),
    INDEX idx_patients_site       (site_id),
    INDEX idx_patients_protocol   (protocol_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── patient_documents ─────────────────────────────────────────────
CREATE TABLE patient_documents (
    document_id  BIGINT       NOT NULL AUTO_INCREMENT,
    patient_id   BIGINT       NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    data         LONGBLOB     NOT NULL,
    uploaded_at  VARCHAR(100) NOT NULL,
    PRIMARY KEY (document_id),
    CONSTRAINT fk_pdoc_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE CASCADE,
    INDEX idx_pdoc_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── visits ────────────────────────────────────────────────────────
CREATE TABLE visits (
    visit_id    BIGINT        NOT NULL AUTO_INCREMENT,
    patient_id  BIGINT        NOT NULL,
    protocol_id BIGINT,
    site_id     BIGINT,
    visit_date  VARCHAR(50)   NOT NULL,                -- stored as String (e.g. "2026-03-10")
    status      VARCHAR(100)  NOT NULL,                -- SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED | MISSED
    notes       VARCHAR(1000),
    PRIMARY KEY (visit_id),
    CONSTRAINT fk_visit_patient FOREIGN KEY (patient_id)
        REFERENCES patients (patient_id) ON DELETE CASCADE,
    INDEX idx_visit_patient  (patient_id),
    INDEX idx_visit_protocol (protocol_id),
    INDEX idx_visit_site     (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed Patients ─────────────────────────────────────────────────
INSERT INTO patients (name, dob, contact_info, enrollment_status, site_id, protocol_id) VALUES
('Alice Thompson',   '1985-06-12', '+91-9111111101', 'ENROLLED',   1, 1),
('Robert Kumar',     '1990-11-22', '+91-9111111102', 'SCREENING',  1, 1),
('Maria Santos',     '1978-03-30', '+91-9111111103', 'COMPLETED',  2, 2),
('David Chen',       '1995-07-04', '+91-9111111104', 'ENROLLED',   2, 2),
('Priya Nair',       '1988-01-17', '+91-9111111105', 'WITHDRAWN',  3, 3),
('James Wilson',     '1972-09-08', '+91-9111111106', 'ENROLLED',   3, 1),
('Fatima Al-Hassan', '1993-12-25', '+91-9111111107', 'SCREENING',  1, 2),
('Ravi Shankar',     '1980-05-20', '+91-9111111108', 'COMPLETED',  2, 3);

-- ── Seed Visits ───────────────────────────────────────────────────
INSERT INTO visits (patient_id, protocol_id, site_id, visit_date, status, notes) VALUES
(1, 1, 1, '2026-01-10', 'COMPLETED',   'Baseline screening completed successfully.'),
(1, 1, 1, '2026-02-10', 'COMPLETED',   'Month-1 follow-up — all vitals normal.'),
(1, 1, 1, '2026-03-10', 'SCHEDULED',   'Month-2 follow-up pending.'),
(2, 1, 1, '2026-01-15', 'COMPLETED',   'Initial screening visit.'),
(2, 1, 1, '2026-02-20', 'IN_PROGRESS', 'Ongoing blood work analysis.'),
(3, 2, 2, '2025-11-05', 'COMPLETED',   'Final study visit completed.'),
(4, 2, 2, '2026-02-01', 'COMPLETED',   'Quarterly assessment.'),
(4, 2, 2, '2026-04-01', 'SCHEDULED',   'Next quarterly assessment.'),
(5, 3, 3, '2026-01-20', 'CANCELLED',   'Patient withdrew from the study.'),
(6, 1, 3, '2026-03-05', 'SCHEDULED',   'Initial enrollment visit.'),
(7, 2, 1, '2026-02-28', 'COMPLETED',   'Screening labs collected.'),
(8, 3, 2, '2025-12-15', 'COMPLETED',   'End-of-study visit.');


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  3.  PROTOCOL SERVICE  ─  biotrack_protocol                ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_protocol
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_protocol;

-- ── sites ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS protocol_site_mapping;
DROP TABLE IF EXISTS protocols;
DROP TABLE IF EXISTS sites;

CREATE TABLE sites (
    site_id        BIGINT       NOT NULL AUTO_INCREMENT,
    name           VARCHAR(255) NOT NULL,
    location       VARCHAR(255) NOT NULL,
    investigator_id VARCHAR(255) NOT NULL,             -- stores name or external ID
    status         ENUM('ACTIVE','INACTIVE','PENDING_APPROVAL') NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (site_id),
    INDEX idx_sites_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── protocols ─────────────────────────────────────────────────────
CREATE TABLE protocols (
    protocol_id BIGINT       NOT NULL AUTO_INCREMENT,
    title       VARCHAR(255) NOT NULL,
    phase       ENUM('PHASE_I','PHASE_II','PHASE_III','PHASE_IV') NOT NULL,
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    status      VARCHAR(100) NOT NULL,                 -- ACTIVE | DRAFT | COMPLETED | CLOSED | ON_HOLD
    PRIMARY KEY (protocol_id),
    INDEX idx_protocols_phase  (phase),
    INDEX idx_protocols_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── protocol_site_mapping (join table) ────────────────────────────
CREATE TABLE protocol_site_mapping (
    protocol_id BIGINT NOT NULL,
    site_id     BIGINT NOT NULL,
    PRIMARY KEY (protocol_id, site_id),
    CONSTRAINT fk_psm_protocol FOREIGN KEY (protocol_id)
        REFERENCES protocols (protocol_id) ON DELETE CASCADE,
    CONSTRAINT fk_psm_site FOREIGN KEY (site_id)
        REFERENCES sites (site_id) ON DELETE CASCADE,
    INDEX idx_psm_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed Sites ────────────────────────────────────────────────────
INSERT INTO sites (name, location, investigator_id, status) VALUES
('City Research Center',       'Mumbai, Maharashtra',   'Dr. Arjun Mehta',     'ACTIVE'),
('Coastal Clinical Labs',      'Chennai, Tamil Nadu',   'Dr. Priya Suresh',    'ACTIVE'),
('Northern Trial Facility',    'Delhi, NCR',            'Dr. Rajiv Kapoor',    'ACTIVE'),
('Eastern Bio Institute',      'Kolkata, West Bengal',  'Dr. Ankita Das',      'PENDING_APPROVAL'),
('Southern Health Hub',        'Hyderabad, Telangana',  'Dr. Srinivasa Rao',   'ACTIVE'),
('Western Clinical Unit',      'Pune, Maharashtra',     'Dr. Meera Joshi',     'INACTIVE');

-- ── Seed Protocols ────────────────────────────────────────────────
INSERT INTO protocols (title, phase, start_date, end_date, status) VALUES
('Cardio-X Phase I Safety Study',       'PHASE_I',   '2025-01-01', '2025-12-31', 'ACTIVE'),
('OncoPlex Efficacy Trial',             'PHASE_II',  '2025-03-01', '2026-06-30', 'ACTIVE'),
('NeuroClear Long-Term Evaluation',     'PHASE_III', '2024-06-01', '2026-12-31', 'ACTIVE'),
('PulmoVax Dosage Study',               'PHASE_I',   '2026-01-15', '2026-09-15', 'DRAFT'),
('DiabCare Comparative Study',          'PHASE_II',  '2025-07-01', '2026-12-31', 'ACTIVE'),
('ImmunoBridge Pilot Protocol',         'PHASE_IV',  '2023-01-01', '2024-12-31', 'COMPLETED');

-- ── Seed Protocol-Site Mappings ───────────────────────────────────
INSERT INTO protocol_site_mapping (protocol_id, site_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 2), (2, 4), (2, 5),
(3, 1), (3, 3), (3, 6),
(4, 1),
(5, 2), (5, 5),
(6, 1), (6, 2), (6, 3);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  4.  SAMPLE SERVICE  ─  biotrack_sample                    ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_sample
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_sample;

-- ── samples ───────────────────────────────────────────────────────
DROP TABLE IF EXISTS lab_results;
DROP TABLE IF EXISTS samples;

CREATE TABLE samples (
    sample_id      BIGINT NOT NULL AUTO_INCREMENT,
    collected_date DATE   NOT NULL,
    status         ENUM('COLLECTED','IN_STORAGE','ANALYZED','DISPOSED') NOT NULL DEFAULT 'COLLECTED',
    patient_id     BIGINT NOT NULL,
    site_id        BIGINT NOT NULL,
    protocol_id    BIGINT NOT NULL,
    PRIMARY KEY (sample_id),
    INDEX idx_samples_patient  (patient_id),
    INDEX idx_samples_protocol (protocol_id),
    INDEX idx_samples_status   (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── lab_results ───────────────────────────────────────────────────
CREATE TABLE lab_results (
    result_id    BIGINT       NOT NULL AUTO_INCREMENT,
    sample_id    BIGINT       NOT NULL,
    test_type    VARCHAR(255) NOT NULL,
    result_value VARCHAR(255) NOT NULL,
    date         DATE         NOT NULL,
    status       ENUM('PENDING','COMPLETED','REVIEWED','REJECTED') NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY  (result_id),
    UNIQUE KEY uq_labresult_sample (sample_id),
    CONSTRAINT fk_lr_sample FOREIGN KEY (sample_id)
        REFERENCES samples (sample_id) ON DELETE CASCADE,
    INDEX idx_lr_status (status),
    INDEX idx_lr_date   (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed Samples ─────────────────────────────────────────────────
INSERT INTO samples (collected_date, status, patient_id, site_id, protocol_id) VALUES
('2026-01-10', 'ANALYZED',   1, 1, 1),
('2026-02-10', 'ANALYZED',   1, 1, 1),
('2026-01-15', 'IN_STORAGE', 2, 1, 1),
('2025-11-05', 'ANALYZED',   3, 2, 2),
('2026-02-01', 'ANALYZED',   4, 2, 2),
('2026-01-20', 'DISPOSED',   5, 3, 3),
('2026-03-05', 'COLLECTED',  6, 3, 1),
('2026-02-28', 'ANALYZED',   7, 1, 2),
('2025-12-15', 'ANALYZED',   8, 2, 3),
('2026-04-01', 'COLLECTED',  4, 2, 2);

-- ── Seed Lab Results ─────────────────────────────────────────────
INSERT INTO lab_results (sample_id, test_type, result_value, date, status) VALUES
(1,  'Complete Blood Count',      'WBC: 6.2 K/µL, RBC: 4.8 M/µL, Hgb: 14.2 g/dL',   '2026-01-11', 'REVIEWED'),
(2,  'Lipid Panel',               'Total Chol: 185 mg/dL, LDL: 110 mg/dL',            '2026-02-11', 'REVIEWED'),
(4,  'Liver Function Test',       'ALT: 32 U/L, AST: 28 U/L, ALP: 78 U/L',           '2025-11-06', 'REVIEWED'),
(5,  'Blood Glucose',             'Fasting: 98 mg/dL, HbA1c: 5.4%%',                  '2026-02-02', 'COMPLETED'),
(8,  'Urinalysis',                'pH: 6.5, Protein: Negative, Glucose: Negative',     '2026-03-01', 'REVIEWED'),
(9,  'Coagulation Panel',         'PT: 12.5 sec, INR: 1.1, aPTT: 30 sec',            '2025-12-16', 'REVIEWED'),
(7,  'Comprehensive Metabolic',   'BUN: 18 mg/dL, Creatinine: 0.9 mg/dL',             '2026-03-06', 'PENDING'),
(3,  'Inflammatory Markers',      'CRP: 2.1 mg/L, ESR: 14 mm/hr',                    '2026-01-16', 'PENDING');


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  5.  NOTIFICATIONS SERVICE  ─  biotrack_notifications      ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_notifications
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_notifications;

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    notification_id BIGINT        NOT NULL AUTO_INCREMENT,
    user_id         BIGINT        NOT NULL,
    message         VARCHAR(1000) NOT NULL,
    type            ENUM('EMAIL','SMS','SYSTEM') NOT NULL,
    status          ENUM('UNREAD','READ') NOT NULL DEFAULT 'UNREAD',
    created_date    VARCHAR(100)  NOT NULL,
    recipient_email VARCHAR(255),
    PRIMARY KEY (notification_id),
    INDEX idx_notif_user   (user_id),
    INDEX idx_notif_status (status),
    INDEX idx_notif_type   (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed Notifications ────────────────────────────────────────────
INSERT INTO notifications (user_id, message, type, status, created_date, recipient_email) VALUES
(1, 'New user Ayush Ranjan has been registered in the system.',                           'SYSTEM', 'READ',   '2026-01-02', 'agarwalsania2004@gmail.com'),
(2, 'Protocol "Cardio-X Phase I Safety Study" has been assigned to your site.',           'EMAIL',  'READ',   '2026-01-05', 'nagikusa050@gmail.com'),
(3, 'Sample #7 has been collected and is ready for processing.',                          'SYSTEM', 'UNREAD', '2026-03-05', 'mallharkhatua@gmail.com'),
(3, 'Lab result for Sample #5 requires your review.',                                     'EMAIL',  'UNREAD', '2026-02-03', 'mallharkhatua@gmail.com'),
(4, 'Protocol "NeuroClear Long-Term Evaluation" documentation has been updated.',         'SYSTEM', 'READ',   '2026-02-15', 'chaurasianikita984@gmail.com'),
(5, 'Compliance audit for Q1 2026 is due in 7 days.',                                    'EMAIL',  'UNREAD', '2026-03-24', 'snehithapriscillaganta7890@gmail.com'),
(6, 'KPI report for enrollment rate is now available.',                                   'SYSTEM', 'READ',   '2026-02-01', 'prateekbora71@gmail.com'),
(1, 'Patient Alice Thompson has completed the final study visit.',                        'SYSTEM', 'UNREAD', '2026-03-10', 'agarwalsania2004@gmail.com'),
(2, 'Visit scheduled for Patient Robert Kumar on 2026-02-20.',                           'EMAIL',  'READ',   '2026-02-18', 'nagikusa050@gmail.com'),
(1, 'Critical lab result detected for Sample #9 — immediate review required.',           'EMAIL',  'UNREAD', '2025-12-17', 'agarwalsania2004@gmail.com');


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  6.  COMPLIANCE SERVICE  ─  biotrack_compliance            ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_compliance
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_compliance;

-- ── audit_logs ────────────────────────────────────────────────────
DROP TABLE IF EXISTS compliance_reports;
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
    audit_id     BIGINT       NOT NULL AUTO_INCREMENT,
    user_id      BIGINT,
    performed_by VARCHAR(255),
    action       ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT') NOT NULL,
    protocol_id  BIGINT,
    timestamp    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_id),
    INDEX idx_audit_user      (user_id),
    INDEX idx_audit_action    (action),
    INDEX idx_audit_protocol  (protocol_id),
    INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── compliance_reports ────────────────────────────────────────────
CREATE TABLE compliance_reports (
    report_id      BIGINT        NOT NULL AUTO_INCREMENT,
    scope          VARCHAR(255)  NOT NULL,
    metrics        VARCHAR(1000) NOT NULL,
    generated_date DATE          NOT NULL,
    PRIMARY KEY (report_id),
    INDEX idx_crep_date  (generated_date),
    INDEX idx_crep_scope (scope(50))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed Audit Logs ───────────────────────────────────────────────
INSERT INTO audit_logs (user_id, performed_by, action, protocol_id, timestamp) VALUES
(1, 'Sania Agarwal',    'LOGIN',  NULL, '2026-01-02 09:00:00'),
(1, 'Sania Agarwal',    'CREATE', 1,    '2026-01-02 09:15:00'),
(1, 'Sania Agarwal',    'CREATE', 2,    '2026-01-02 09:30:00'),
(2, 'Ayush Ranjan',     'LOGIN',  NULL, '2026-01-05 10:00:00'),
(2, 'Ayush Ranjan',     'UPDATE', 1,    '2026-01-05 10:20:00'),
(3, 'Malhar Khatua',    'LOGIN',  NULL, '2026-01-10 08:30:00'),
(3, 'Malhar Khatua',    'CREATE', 1,    '2026-01-10 08:45:00'),
(4, 'Nikita Chaurasia', 'LOGIN',  NULL, '2026-02-15 11:00:00'),
(4, 'Nikita Chaurasia', 'UPDATE', 3,    '2026-02-15 11:20:00'),
(5, 'Snehitha Ganta',   'LOGIN',  NULL, '2026-03-01 09:00:00'),
(5, 'Snehitha Ganta',   'CREATE', NULL, '2026-03-01 09:10:00'),
(1, 'Sania Agarwal',    'DELETE', 6,    '2026-03-15 14:00:00'),
(2, 'Ayush Ranjan',     'LOGOUT', NULL, '2026-01-05 18:00:00'),
(3, 'Malhar Khatua',    'LOGOUT', NULL, '2026-01-10 17:00:00'),
(1, 'Sania Agarwal',    'UPDATE', 4,    '2026-04-01 10:00:00');

-- ── Seed Compliance Reports ───────────────────────────────────────
INSERT INTO compliance_reports (scope, metrics, generated_date) VALUES
('Q1-2026 Protocol Compliance',       'Total Protocols: 6 | Compliant: 5 | Non-Compliant: 1 | Compliance Rate: 83%%',  '2026-04-01'),
('Q4-2025 Site Audit Report',         'Sites Audited: 5 | Passed: 4 | Failed: 1 | Issues Resolved: 3',                 '2026-01-05'),
('2025 Annual Data Integrity Report', 'Records Reviewed: 1240 | Errors Found: 12 | Corrected: 12 | Accuracy: 99.0%%',  '2026-01-15'),
('Q1-2026 Patient Consent Audit',     'Patients Reviewed: 8 | Consents Valid: 8 | Expired: 0 | Compliance: 100%%',     '2026-04-10'),
('Q1-2026 Lab Result Audit',          'Results Audited: 8 | Reviewed: 6 | Pending: 2 | Review Rate: 75%%',             '2026-04-05');


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  7.  ANALYTICS SERVICE  ─  biotrack_analytics              ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE DATABASE IF NOT EXISTS biotrack_analytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE biotrack_analytics;

DROP TABLE IF EXISTS kpi_reports;
CREATE TABLE kpi_reports (
    report_id      BIGINT        NOT NULL AUTO_INCREMENT,
    scope          ENUM(
                       'ENROLLMENT_RATE',
                       'SAMPLE_PROCESSING_RATE',
                       'COMPLIANCE_SCORE'
                   ) NOT NULL,
    metrics        VARCHAR(2000) NOT NULL,
    generated_date DATE          NOT NULL,
    PRIMARY KEY (report_id),
    INDEX idx_kpi_scope (scope),
    INDEX idx_kpi_date  (generated_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed KPI Reports ─────────────────────────────────────────────
INSERT INTO kpi_reports (scope, metrics, generated_date) VALUES
('ENROLLMENT_RATE',        'Total Target: 100 | Enrolled: 8 | Screening: 2 | Completed: 2 | Withdrawn: 1 | Rate: 80%%', '2026-04-01'),
('ENROLLMENT_RATE',        'Total Target: 80  | Enrolled: 6 | Screening: 1 | Completed: 3 | Withdrawn: 0 | Rate: 87%%', '2026-01-01'),
('SAMPLE_PROCESSING_RATE', 'Collected: 10 | In Storage: 1 | Analyzed: 7 | Disposed: 1 | Pending Results: 2 | Rate: 70%%', '2026-04-01'),
('SAMPLE_PROCESSING_RATE', 'Collected: 6  | In Storage: 0 | Analyzed: 5 | Disposed: 1 | Pending Results: 1 | Rate: 83%%', '2026-01-01'),
('COMPLIANCE_SCORE',       'Protocols Compliant: 5/6 | Sites Audited: 5/6 | Reports Generated: 5 | Overall Score: 85%%', '2026-04-01'),
('COMPLIANCE_SCORE',       'Protocols Compliant: 4/5 | Sites Audited: 4/5 | Reports Generated: 3 | Overall Score: 80%%', '2026-01-01');


-- ================================================================
-- END OF SCRIPT
-- ================================================================
-- QUICK VERIFICATION QUERIES:
-- SELECT 'biotrack_iam'            AS db, COUNT(*) AS users            FROM biotrack_iam.users;
-- SELECT 'biotrack_patient'        AS db, COUNT(*) AS patients          FROM biotrack_patient.patients;
-- SELECT 'biotrack_patient'        AS db, COUNT(*) AS visits            FROM biotrack_patient.visits;
-- SELECT 'biotrack_protocol'       AS db, COUNT(*) AS protocols         FROM biotrack_protocol.protocols;
-- SELECT 'biotrack_protocol'       AS db, COUNT(*) AS sites             FROM biotrack_protocol.sites;
-- SELECT 'biotrack_protocol'       AS db, COUNT(*) AS mappings          FROM biotrack_protocol.protocol_site_mapping;
-- SELECT 'biotrack_sample'         AS db, COUNT(*) AS samples           FROM biotrack_sample.samples;
-- SELECT 'biotrack_sample'         AS db, COUNT(*) AS lab_results       FROM biotrack_sample.lab_results;
-- SELECT 'biotrack_notifications'  AS db, COUNT(*) AS notifications     FROM biotrack_notifications.notifications;
-- SELECT 'biotrack_compliance'     AS db, COUNT(*) AS audit_logs        FROM biotrack_compliance.audit_logs;
-- SELECT 'biotrack_compliance'     AS db, COUNT(*) AS compliance_reports FROM biotrack_compliance.compliance_reports;
-- SELECT 'biotrack_analytics'      AS db, COUNT(*) AS kpi_reports       FROM biotrack_analytics.kpi_reports;
-- ================================================================

SET FOREIGN_KEY_CHECKS = 1;

