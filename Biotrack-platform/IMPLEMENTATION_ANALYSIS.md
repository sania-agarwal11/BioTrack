# BioTrack Microservices Implementation Analysis

## Monolithic Application Functionality Overview

The monolithic BioTrack application has been analyzed and the following functionalities have been identified:

### Controllers (12 total)
1. **AuthController** - Authentication & User Login
2. **UserController** - User Management (CRUD)
3. **PatientController** - Patient Registration & Management
4. **SampleController** - Sample Collection & Tracking
5. **LabResultController** - Lab Test Results
6. **VisitController** - Patient Visits
7. **ProtocolController** - Clinical Trial Protocols
8. **SiteController** - Site Management
9. **NotificationController** - System Notifications
10. **ComplianceReportController** - Compliance Reports
11. **AuditLogController** - Audit Trail Logging
12. **KpiReportController** - Analytics & KPI Reports

### Entities (11 total)
- User, Patient, Sample, LabResult, Visit, Protocol, Site, Notification, ComplianceReport, AuditLog, KpiReport

### Security Features
- JWT Token-Based Authentication
- Role-Based Access Control (RBAC):
  - ADMIN
  - CLINICAL_TRIAL_MANAGER
  - LAB_TECHNICIAN
  - RESEARCH_SCIENTIST
  - REGULATORY_OFFICER
  - DATA_MANAGER
- Password Encoding (BCrypt)
- Stateless Session Management

---

## Microservices Distribution Mapping

### 1. **IAM-Service** (Identity & Access Management)
**Port:** 8081
**Responsibilities:**
- User Registration & Management
- JWT Token Generation & Validation
- Role-based Authentication
- User Profile Management

**Controllers:**
- `AuthController` - /auth/* endpoints (login, register, token validation)
- `UserController` - /users/* endpoints (CRUD operations)

**Entities:**
- User

**Dependencies:**
- Spring Security
- JWT (JJWT)
- Spring Data JPA
- MySQL Connector

---

### 2. **Patient-Service**
**Port:** 8082
**Responsibilities:**
- Patient Registration & Management
- Patient Site Assignment
- Patient Enrollment Tracking

**Controllers:**
- `PatientController` - /patients/* endpoints
- `SiteController` - /sites/* endpoints (site data for patient management)

**Entities:**
- Patient
- Site

**Database Relations:**
- Patient → Site (Many-to-One)
- Patient → Visits (One-to-Many)
- Patient → Samples (One-to-Many)

**API Endpoints:**
```
POST /patients - Create patient
GET /patients - Get all patients
GET /patients/{id} - Get patient by ID
PUT /patients/{id} - Update patient
DELETE /patients/{id} - Delete patient
POST /patients/{patientId}/assign-site/{siteId} - Assign to site
```

---

### 3. **Sample-Service**
**Port:** 8083
**Responsibilities:**
- Sample Collection Management
- Lab Result Tracking
- Test Result Processing

**Controllers:**
- `SampleController` - /samples/* endpoints
- `LabResultController` - /lab-results/* endpoints

**Entities:**
- Sample
- LabResult

**Database Relations:**
- Sample → Patient (Many-to-One)
- Sample → LabResult (One-to-One)

**API Endpoints:**
```
POST /samples - Create sample
GET /samples - Get all samples
GET /samples/{id} - Get sample by ID
PUT /samples/{id} - Update sample
DELETE /samples/{id} - Delete sample

POST /lab-results - Create lab result
GET /lab-results - Get all lab results
```

---

### 4. **Notifications-Service**
**Port:** 8084
**Responsibilities:**
- Notification Management
- User Alert System
- Notification Status Tracking

**Controllers:**
- `NotificationController` - /notifications/* endpoints

**Entities:**
- Notification (userId, message, category, status, createdDate)

**API Endpoints:**
```
POST /notifications - Create notification
GET /notifications - Get all notifications
GET /notifications/{id} - Get notification by ID
DELETE /notifications/{id} - Delete notification
```

---

### 5. **Compliance-Service**
**Port:** 8085
**Responsibilities:**
- Compliance Report Generation
- Audit Log Tracking
- Regulatory Compliance Monitoring

**Controllers:**
- `ComplianceReportController` - /compliance/* endpoints
- `AuditLogController` - /audit-logs/* endpoints

**Entities:**
- ComplianceReport
- AuditLog

**API Endpoints:**
```
POST /compliance - Create compliance report
GET /compliance - Get all reports
GET /compliance/{id} - Get report by ID

POST /audit-logs - Create audit log
GET /audit-logs - Get all audit logs
GET /audit-logs/{id} - Get audit log by ID
```

---

### 6. **Protocol-Service**
**Port:** 8086
**Responsibilities:**
- Clinical Trial Protocol Management
- Protocol Status Tracking
- Site-Protocol Association

**Controllers:**
- `ProtocolController` - /protocols/* endpoints

**Entities:**
- Protocol
- Site (shared entity with Patient-Service)

**Database Relations:**
- Protocol → Sites (One-to-Many with bidirectional JSON managed reference)

**API Endpoints:**
```
POST /protocols - Create protocol
GET /protocols - Get all protocols
GET /protocols/{id} - Get protocol by ID
PUT /protocols/{id} - Update protocol
DELETE /protocols/{id} - Delete protocol
GET /protocols/{id}/sites - Get sites for protocol
```

---

### 7. **Analytics-Service**
**Port:** 8087
**Responsibilities:**
- KPI Report Generation
- Analytics & Metrics
- Data Aggregation

**Controllers:**
- `KpiReportController` - /kpi-reports/* endpoints

**Entities:**
- KpiReport

**API Endpoints:**
```
POST /kpi-reports - Create KPI report
GET /kpi-reports - Get all reports
GET /kpi-reports/{id} - Get report by ID
```

---

## Cross-Service Dependencies

### Service-to-Service Communication
Due to shared entities and relationships, services will need to communicate:

1. **Patient-Service ↔ Protocol-Service**
   - Patient references Site, Site references Protocol
   - When getting patient details, may need protocol info

2. **Sample-Service ↔ Patient-Service**
   - Sample references Patient
   - Need patient context for sample creation

3. **Notifications-Service ↔ All Services**
   - Triggered by create/update operations in other services
   - Publish events when critical operations occur

4. **Compliance-Service ↔ All Services**
   - Audit logs created for all operations
   - Compliance reports aggregate data from all services

5. **Analytics-Service ↔ All Services**
   - Consumes data from all services for KPI generation

---

## Security & JWT Implementation

### IAM-Service Configuration
- **JWT Secret Key:** Generated using HS256 algorithm
- **Token Expiration:** 1 hour (configurable)
- **Token Claims:** username, authorities, issuedAt, expiration

### Gateway Configuration
- Add JWT filter to API Gateway
- Token validation before routing to services
- Role-based routing rules

### Service-Level Security
- Each service validates JWT from incoming requests
- Extract user information from token claims
- Enforce role-based access control at controller level

---

## Database Schema

### Shared Tables Structure

**users**
```sql
- userId (PK)
- name
- email
- phone
- role
- password
```

**patients**
```sql
- patientId (PK)
- name
- dob
- contactInfo
- enrollmentStatus
- site_id (FK)
```

**samples**
```sql
- sampleId (PK)
- collectedDate
- status
- patient_id (FK)
- site_id (FK)
```

**lab_results**
```sql
- resultId (PK)
- testType
- resultValue
- date
- status
- sample_id (FK)
```

**sites**
```sql
- siteId (PK)
- siteName
- location
- protocol_id (FK)
```

**protocols**
```sql
- protocolId (PK)
- title
- phase
- startDate
- endDate
- status
```

**notifications**
```sql
- notificationId (PK)
- userId (FK)
- message
- category
- status
- createdDate
```

**compliance_reports**
```sql
- reportId (PK)
- scope
- metrics
- generatedDate
```

**audit_logs**
```sql
- auditId (PK)
- userId (FK)
- action
- timestamp
```

**kpi_reports**
```sql
- reportId (PK)
- metric
- value
- generatedDate
```

---

## Implementation Phases

### Phase 1: Foundation (COMPLETE)
- ✅ Version Compatibility (3.3.5 Spring Boot, 2023.0.3 Spring Cloud)
- ⏳ Common Utilities (DTOs, Mappers, Exception Handling)

### Phase 2: IAM Service
- Implement AuthController
- Implement UserController
- Setup JWT Security
- Configure Role-Based Access

### Phase 3: Core Services
- Patient-Service
- Sample-Service
- Protocol-Service

### Phase 4: Supporting Services
- Notifications-Service
- Compliance-Service
- Analytics-Service

### Phase 5: Integration
- Configure API Gateway with service routes
- Setup service-to-service communication
- Configure Eureka client registration

### Phase 6: Testing & Optimization
- Integration testing
- Performance optimization
- Security hardening

---

## Technology Stack

- **Framework:** Spring Boot 3.3.5
- **Cloud:** Spring Cloud 2023.0.3
- **Security:** Spring Security + JWT (JJWT 0.11.5)
- **Database:** MySQL
- **Build:** Maven
- **Java Version:** 17
- **Service Registry:** Eureka
- **API Gateway:** Spring Cloud Gateway
- **Documentation:** OpenAPI/Swagger

---

## Notes & Considerations

1. **Entity Relationships:**
   - Use `@JsonManagedReference` / `@JsonBackReference` for circular references
   - Implement lazy loading where appropriate
   - Use cascade operations carefully

2. **DTOs:**
   - Separate Request and Response DTOs
   - Use mappers for conversion
   - Hide sensitive data in responses

3. **Audit & Compliance:**
   - Log all CRUD operations
   - Track user actions via userId from JWT
   - Generate compliance reports from audit logs

4. **Error Handling:**
   - Custom exception classes for domain-specific errors
   - Global exception handler in each service
   - Consistent error response format

5. **Performance:**
   - Use pagination for list endpoints
   - Implement caching where appropriate
   - Use database indexes on foreign keys

