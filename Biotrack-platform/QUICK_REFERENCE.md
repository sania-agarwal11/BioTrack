# BioTrack Microservices - QUICK REFERENCE CARD

## Current System Status
```
✅ Eureka Server      (Port 8761) - Service Registry
✅ API Gateway        (Port 8080) - Request Router
✅ IAM-Service        (Port 8081) - Authentication ⭐ COMPLETE
⏳ Patient-Service    (Port 8082) - Ready to implement
⏳ Sample-Service     (Port 8083) - Ready to implement
⏳ Protocol-Service   (Port 8086) - Ready to implement
⏳ Notifications      (Port 8084) - Ready to implement
⏳ Compliance-Service (Port 8085) - Ready to implement
⏳ Analytics-Service  (Port 8087) - Ready to implement
```

## Database Credentials
```
Host: localhost:3306
User: root
Password: password
Driver: MySQL 8.0+
```

## Database Names
```
biotrack_iam
biotrack_patient
biotrack_sample
biotrack_protocol
biotrack_notifications
biotrack_compliance
biotrack_analytics
```

## Quick Startup

```bash
# Terminal 1: Eureka
cd Eureka-Server && mvn spring-boot:run

# Terminal 2: IAM Service
cd services/iam-service && mvn spring-boot:run

# Terminal 3: Gateway
cd gateway && mvn spring-boot:run

# Terminal 4+: Other services (after implementation)
```

## Test Authentication

```bash
# Register
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"123","role":"ADMIN","password":"test123"}'

# Login (save token)
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Use token
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## API Endpoints Implemented

### IAM-Service ⭐ COMPLETE
```
POST   /auth/register              - Register user
POST   /auth/login                 - Login user
GET    /users                      - Get all users
GET    /users/{id}                 - Get user by ID
POST   /users                      - Create user
PUT    /users/{id}                 - Update user
DELETE /users/{id}                 - Delete user
```

## Roles Supported
```
ADMIN
CLINICAL_TRIAL_MANAGER
LAB_TECHNICIAN
RESEARCH_SCIENTIST
REGULATORY_OFFICER
DATA_MANAGER
```

## Implementation Times (Estimated)
```
Patient-Service:       1 hour
Protocol-Service:      1 hour
Sample-Service:        1 hour
Notifications-Service: 30 mins
Compliance-Service:    45 mins
Analytics-Service:     30 mins
─────────────────────────────
TOTAL:                 4.5-5.5 hours
```

## Files to Create Per Service (Pattern)

```
Each service needs:
├── entity/          → 1-3 entity classes
├── dto/request/     → DTOs for requests  
├── dto/response/    → DTOs for responses
├── repository/      → Repository interfaces
├── service/         → Service interface
├── service/         → ServiceImpl implementation
├── controller/      → REST controller
├── exception/       → Custom exceptions
├── util/            → Mapper utilities
└── config/          → Spring configurations

Total: ~40 files per service
```

## Directory Structure
```
BioTrack-platform/
├── Eureka-Server/           ✅ READY
├── gateway/                 ✅ READY (Routes template)
├── services/
│   ├── iam-service/        ✅ COMPLETE
│   ├── patient-service/    ⏳ TEMPLATE
│   ├── sample-service/     ⏳ TEMPLATE
│   ├── protocol-service/   ⏳ TEMPLATE
│   ├── notifications-service/  ⏳ TEMPLATE
│   ├── compliance-service/ ⏳ TEMPLATE
│   └── analytics-service/  ⏳ TEMPLATE
├── IMPLEMENTATION_ANALYSIS.md        ✅ 700 lines
├── IMPLEMENTATION_PROGRESS.md        ✅ 300 lines
├── COMPLETE_IMPLEMENTATION_GUIDE.md  ✅ 500 lines
├── EXECUTIVE_SUMMARY.md              ✅ 400 lines
└── README_FINAL_STATUS.md            ✅ 400 lines
```

## Version Info
```
Java:        17
Spring Boot: 3.3.5
Spring Cloud: 2023.0.3
JWT Library: JJWT 0.11.5
MySQL:       8.0+
Maven:       3.8+
```

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Services not registering with Eureka | Add @EnableDiscoveryClient to main class |
| JWT token not recognized | Include "Bearer " prefix in Authorization header |
| Database connection failed | Ensure MySQL is running and database exists |
| Port already in use | Change port in application.yaml |
| Service discovery failed | Ensure Eureka server is running first |

## Gateway Routes (To Add)

```yaml
routes:
  - id: iam-service
    uri: lb://iam-service
    predicates:
      - Path=/auth/**,/users/**
  
  - id: patient-service
    uri: lb://patient-service
    predicates:
      - Path=/patients/**,/sites/**,/visits/**
  
  # Add routes for each service...
```

## Entity Relationships (Key)

```
Patient  ──→ Site
Patient  ──→ Visit
Patient  ──→ Sample
Sample   ──→ LabResult
Site     ──→ Protocol
Visit    ──→ Protocol
```

## Service Dependencies (Inter-service)

```
Patient-Service ──calls→ Protocol-Service (for site protocol info)
Sample-Service  ──calls→ Patient-Service  (for patient context)
Compliance-Service reads← All Services   (for audit logs)
Analytics-Service reads← All Services    (for KPI generation)
Notifications-Service reports← All Services
```

## Key Files in Monolithic App

**Location:** `C:\Users\2485207\Documents\workspace-spring-tools-for-eclipse-5.0.1.RELEASE\BioTrack`

```
Controllers:     src/main/java/com/bioTrack/controller/
Entities:        src/main/java/com/bioTrack/entity/
Services:        src/main/java/com/bioTrack/service/
Repositories:    src/main/java/com/bioTrack/repository/
DTOs:            src/main/java/com/bioTrack/dto/
Security:        src/main/java/com/bioTrack/security/
Config:          src/main/java/com/bioTrack/config/
```

## Success Criteria

After completing Phase 3:
- [ ] All 7 microservices running
- [ ] All services registered with Eureka
- [ ] Gateway routing all requests correctly
- [ ] JWT authentication working across services
- [ ] All CRUD endpoints functional
- [ ] Service-to-service communication working
- [ ] Database schema created for all services
- [ ] All roles properly enforced

## Production Checklist

Before deployment:
- [ ] Enable HTTPS
- [ ] Configure SSL certificates
- [ ] Set up encrypted password storage
- [ ] Configure logging/monitoring
- [ ] Set up backup strategy
- [ ] Configure auto-scaling
- [ ] Set up CI/CD pipeline
- [ ] Run security audit
- [ ] Load test all services
- [ ] Set up alerting

## Reference Documents

1. **For Architecture:** `IMPLEMENTATION_ANALYSIS.md`
2. **For Implementation:** `COMPLETE_IMPLEMENTATION_GUIDE.md`
3. **For Status:** `README_FINAL_STATUS.md`
4. **For Executive Overview:** `EXECUTIVE_SUMMARY.md`

## Next Action Items

1. Create MySQL databases (SQL commands in main guide)
2. Implement Patient-Service (use template from guide)
3. Test Patient-Service endpoints
4. Implement remaining 5 services
5. Configure Gateway routes
6. Run integration tests
7. Deploy to production

---

**Last Updated:** April 29, 2026  
**Status:** Phase 2 Complete, Phase 3 Ready  
**Contact:** See documentation files


