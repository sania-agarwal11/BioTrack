# Implementation Progress & Remaining Tasks

## ✅ COMPLETED: IAM-Service (Identity & Access Management)
**Port: 8081**

### Files Created:
- ✅ Entity: `User.java`
- ✅ DTOs: `UserRequestDTO.java`, `UserResponseDTO.java`, `LoginRequest.java`, `TokenResponse.java`
- ✅ Repository: `UserRepository.java`
- ✅ Services: `UserService.java`, `UserServiceImpl.java`
- ✅ Controllers: `AuthController.java`, `UserController.java`
- ✅ Security: `JwtUtil.java`, `CustomUserDetails.java`, `CustomUserDetailsService.java`, `JwtFilter.java`
- ✅ Config: `SecurityConfig.java`
- ✅ Utils: `DtoMapper.java`
- ✅ Application Entry: `IamServiceApplication.java` with `@EnableDiscoveryClient`
- ✅ Configuration: `application.yaml` with database and Eureka settings

### Features:
- User registration with password encoding
- JWT-based authentication
- Role-based access control
- User CRUD operations
- Token generation and validation

---

## 🔄 IN PROGRESS: Patient-Service (Core Domain)
**Port: 8082**

### Entities to Create:
1. Patient
2. Site
3. Visit (depends on Patient & Protocol)

### Required Files:
- Entities: Patient.java, Site.java, Visit.java
- DTOs: PatientRequestDTO, PatientResponseDTO, SiteRequestDTO, SiteResponseDTO, VisitRequestDTO, VisitResponseDTO
- Repositories: PatientRepository, SiteRepository, VisitRepository
- Services: PatientService, PatientServiceImpl, SiteService, SiteServiceImpl, VisitService, VisitServiceImpl
- Controllers: PatientController, SiteController, VisitController
- Utils: Enhanced DtoMapper

---

## ⏳ TO DO: Remaining Services

### Sample-Service (Port: 8083)
**Entities:**
- Sample
- LabResult

**Key Features:**
- Sample collection management
- Lab result tracking
- Sample-Patient relationship
- Lab result-Sample relationship

### Protocol-Service (Port: 8086)
**Entities:**
- Protocol
- Site (shared entity managing Protocol → Sites relationship)

**Key Features:**
- Protocol CRUD
- Site management within protocols
- Protocol-Site bidirectional relationship

### Notifications-Service (Port: 8084)
**Entities:**
- Notification

**Key Features:**
- Notification CRUD
- Notification filtering by user
- Status tracking

### Compliance-Service (Port: 8085)
**Entities:**
- ComplianceReport
- AuditLog

**Key Features:**
- Compliance report generation
- Audit log tracking for all operations
- Query audit logs by user/action/date

### Analytics-Service (Port: 8087)
**Entities:**
- KpiReport

**Key Features:**
- KPI report generation
- Metrics tracking
- Analytics aggregation

---

## Dependencies to Add (pom.xml)

For all services except IAM-Service, add:

```xml
<!-- Security (if not already present) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- OpenAPI/Swagger Documentation -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.14</version>
</dependency>

<!-- Lombok (optional but recommended) -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

---

## Service Implementation Template

Each service follows this structure:

```
src/main/java/com/biotrack/[serviceName]/
├── entity/          # JPA Entities
├── dto/
│   ├── request/     # Request DTOs
│   └── response/    # Response DTOs
├── repository/      # JPA Repositories
├── service/         # Service interfaces
│   └── implementation/  # Service implementations
├── controller/      # REST Controllers
├── security/        # Security classes (optional)
├── config/          # Spring configurations
├── exception/       # Custom exceptions
└── util/            # Utility classes
```

---

## Database Schema

Each service has its own database with unified naming convention:

- `biotrack_iam` - IAM service
- `biotrack_patient` - Patient service
- `biotrack_sample` - Sample service  
- `biotrack_protocol` - Protocol service
- `biotrack_notifications` - Notifications service
- `biotrack_compliance` - Compliance service
- `biotrack_analytics` - Analytics service

Tables are auto-created via Hibernate DDL (`ddl-auto: update`)

---

## Gateway Configuration

The API Gateway (Port: 8080) needs to route to services:

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: iam-service
          uri: lb://iam-service
          predicates:
            - Path=/auth/**,/users/**
        
        - id: patient-service
          uri: lb://patient-service
          predicates:
            - Path=/patients/**,/sites/**,/visits/**
        
        - id: sample-service
          uri: lb://sample-service
          predicates:
            - Path=/samples/**,/lab-results/**
        
        - id: notifications-service
          uri: lb://notifications-service
          predicates:
            - Path=/notifications/**
        
        - id: compliance-service
          uri: lb://compliance-service
          predicates:
            - Path=/compliance/**,/audit-logs/**
        
        - id: protocol-service
          uri: lb://protocol-service
          predicates:
            - Path=/protocols/**
        
        - id: analytics-service
          uri: lb://analytics-service
          predicates:
            - Path=/kpi-reports/**
```

---

## Next Steps

1. Complete Patient-Service implementation
2. Implement Sample-Service
3. Implement Protocol-Service
4. Implement Notifications-Service
5. Implement Compliance-Service
6. Implement Analytics-Service
7. Update Gateway route configurations
8. Test all services with Eureka registration
9. Test inter-service communication
10. Security testing with JWT tokens

