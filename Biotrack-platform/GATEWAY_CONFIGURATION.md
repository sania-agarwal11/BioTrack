# API Gateway Configuration Guide

## Overview

The API Gateway (Port 8080) serves as the single entry point for all client requests to the BioTrack microservices. It uses Spring Cloud Gateway with Eureka service discovery for dynamic routing and load balancing.

---

## Gateway Configuration

### Application YAML Structure

The gateway is configured in `gateway/src/main/resources/application.yaml` with the following components:

1. **Server Port:** 8080
2. **Service Registry:** Eureka (localhost:8761)
3. **Routes:** 11 routes to microservices
4. **Filters:** Response header deduplication

---

## Configured Routes

### 1. IAM Service Routes

#### Authentication Endpoints
```yaml
Route ID: iam-auth
Path Pattern: /auth/**
Target Service: iam-service (Port 8081)
Examples:
  - POST   /auth/register
  - POST   /auth/login
```

#### User Management Endpoints
```yaml
Route ID: iam-users
Path Pattern: /users/**
Target Service: iam-service (Port 8081)
Examples:
  - GET    /users
  - GET    /users/{id}
  - POST   /users
  - PUT    /users/{id}
  - DELETE /users/{id}
```

### 2. Patient Service Routes

#### Patient Management
```yaml
Route ID: patient-service
Path Pattern: /patients/**
Target Service: patient-service (Port 8082)
Examples:
  - GET    /patients
  - GET    /patients/{id}
  - POST   /patients
  - PUT    /patients/{id}
  - DELETE /patients/{id}
```

#### Site Management
```yaml
Route ID: site-service
Path Pattern: /sites/**
Target Service: patient-service (Port 8082)
Examples:
  - GET    /sites
  - GET    /sites/{id}
  - POST   /sites
  - PUT    /sites/{id}
  - DELETE /sites/{id}
```

#### Visit Management
```yaml
Route ID: visit-service
Path Pattern: /visits/**
Target Service: patient-service (Port 8082)
Examples:
  - GET    /visits
  - GET    /visits/{id}
  - POST   /visits
  - PUT    /visits/{id}
  - DELETE /visits/{id}
```

### 3. Sample Service Routes

#### Sample Management
```yaml
Route ID: sample-service
Path Pattern: /samples/**
Target Service: sample-service (Port 8083)
Examples:
  - GET    /samples
  - GET    /samples/{id}
  - POST   /samples
  - PUT    /samples/{id}
  - DELETE /samples/{id}
```

#### Lab Results
```yaml
Route ID: lab-result-service
Path Pattern: /lab-results/**
Target Service: sample-service (Port 8083)
Examples:
  - GET    /lab-results
  - GET    /lab-results/{id}
  - POST   /lab-results
  - PUT    /lab-results/{id}
  - DELETE /lab-results/{id}
```

### 4. Protocol Service Routes

```yaml
Route ID: protocol-service
Path Pattern: /protocols/**
Target Service: protocol-service (Port 8086)
Examples:
  - GET    /protocols
  - GET    /protocols/{id}
  - POST   /protocols
  - PUT    /protocols/{id}
  - DELETE /protocols/{id}
```

### 5. Notifications Service Routes

```yaml
Route ID: notifications-service
Path Pattern: /notifications/**
Target Service: notifications-service (Port 8084)
Examples:
  - GET    /notifications
  - GET    /notifications/{id}
  - POST   /notifications
  - DELETE /notifications/{id}
```

### 6. Compliance Service Routes

#### Compliance Reports
```yaml
Route ID: compliance-service
Path Pattern: /compliance/**
Target Service: compliance-service (Port 8085)
Examples:
  - GET    /compliance
  - GET    /compliance/{id}
  - POST   /compliance
  - PUT    /compliance/{id}
  - DELETE /compliance/{id}
```

#### Audit Logs
```yaml
Route ID: audit-logs-service
Path Pattern: /audit-logs/**
Target Service: compliance-service (Port 8085)
Examples:
  - GET    /audit-logs
  - GET    /audit-logs/{id}
  - POST   /audit-logs
  - DELETE /audit-logs/{id}
```

### 7. Analytics Service Routes

```yaml
Route ID: analytics-service
Path Pattern: /kpi-reports/**
Target Service: analytics-service (Port 8087)
Examples:
  - GET    /kpi-reports
  - GET    /kpi-reports/{id}
  - POST   /kpi-reports
  - PUT    /kpi-reports/{id}
  - DELETE /kpi-reports/{id}
```

---

## Service Discovery (Eureka)

The gateway automatically discovers services registered with Eureka:

- **Eureka Server:** http://localhost:8761
- **Load Balancing:** Round-robin by default
- **Health Checks:** Automatic via Eureka heartbeat
- **Failover:** Automatic to healthy instances

### Service Names (For Discovery)
```
iam-service              → Port 8081
patient-service         → Port 8082
sample-service          → Port 8083
protocol-service        → Port 8086
notifications-service   → Port 8084
compliance-service      → Port 8085
analytics-service       → Port 8087
```

---

## Request Flow

```
Client Request
    ↓
API Gateway (Port 8080)
    ↓
Route Matching (Path predicates)
    ↓
Service Discovery (Eureka)
    ↓
Load Balancing (lb://)
    ↓
Target Microservice
    ↓
Response to Client
```

---

## Testing Gateway Routes

### 1. Test Authentication (No Token Required)

```bash
# Register a new user
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "testuser@biotrack.com",
    "phone": "9876543210",
    "role": "ADMIN",
    "password": "testpass123"
  }'

# Response:
# {
#   "userId": 1,
#   "name": "Test User",
#   "email": "testuser@biotrack.com",
#   "phone": "9876543210",
#   "role": "ADMIN",
#   "password": "$2a$10..."
# }
```

### 2. Login to Get JWT Token

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@biotrack.com",
    "password": "testpass123"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0dXNlckBiaW90cmFjay5jb20iLCJhdXRob3JpdGllcyI6WyJST0xFX0FETUlOIl0sImlhdCI6MTcxODYzMzYwMCwiZXhwIjoxNzE4NjM3MjAwfQ...."
# }
```

### 3. Use Token for Authenticated Requests

```bash
# Save the token
TOKEN="eyJhbGciOiJIUzI1NiJ9..."

# Test Users endpoint
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer $TOKEN"

# Response:
# [
#   {
#     "userId": 1,
#     "name": "Test User",
#     "email": "testuser@biotrack.com",
#     "phone": "9876543210",
#     "role": "ADMIN"
#   }
# ]
```

### 4. Test Patient Service Routes

```bash
TOKEN="<your_jwt_token>"

# Create a patient (when patient-service is implemented)
curl -X POST http://localhost:8080/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "dob": "1990-01-15",
    "contactInfo": "john@example.com",
    "enrollmentStatus": "Enrolled",
    "siteId": 1
  }'

# Get all patients
curl -X GET http://localhost:8080/patients \
  -H "Authorization: Bearer $TOKEN"

# Get specific patient
curl -X GET http://localhost:8080/patients/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test Sample Service Routes

```bash
TOKEN="<your_jwt_token>"

# Create a sample
curl -X POST http://localhost:8080/samples \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectedDate": "2026-04-29",
    "status": "PENDING",
    "patientId": 1,
    "siteId": 1
  }'

# Get all samples
curl -X GET http://localhost:8080/samples \
  -H "Authorization: Bearer $TOKEN"

# Get lab results
curl -X GET http://localhost:8080/lab-results \
  -H "Authorization: Bearer $TOKEN"
```

---

## Gateway Filters

### StripPrefix Filter
- Removes the first path segment before forwarding
- Example: `/patients/123` forwarded as `/patients/123` (not stripped in this config)

### DedupeResponseHeader Filter
- Removes duplicate response headers
- Prevents CORS header duplication

### Default Filters
Applied to all routes:
```yaml
default-filters:
  - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials
```

---

## Monitoring & Debugging

### Check Registered Services

```bash
# Access Eureka dashboard
http://localhost:8761

# You should see:
- gateway (8080)
- iam-service (8081)
- patient-service (8082)
- sample-service (8083)
- protocol-service (8086)
- notifications-service (8084)
- compliance-service (8085)
- analytics-service (8087)
```

### Check Gateway Logs

View logs for gateway route matching:
```bash
# Terminal running gateway
# Should show:
[DEBUG] Mapping [GET /users] to [route id: iam-users]
[DEBUG] Route matched: iam-users
[DEBUG] Routing to lb://iam-service
```

### Trace a Request

```bash
# Enable trace logging in application.yaml
logging:
  level:
    org.springframework.cloud.gateway: TRACE
    org.springframework.security: TRACE
```

---

## Common Issues & Solutions

### Issue: Routes Not Working
**Symptoms:** 404 errors when accessing endpoints
**Solution:** 
1. Ensure all microservices are registered with Eureka
2. Check service names match exactly in routes
3. Verify target services are running on correct ports

### Issue: 503 Service Unavailable
**Symptoms:** Gateway responds with 503 error
**Solution:**
1. Verify Eureka server is running (port 8761)
2. Check target service is registered with Eureka
3. Verify target service is healthy

### Issue: Authorization Failed
**Symptoms:** 401 Unauthorized on protected endpoints
**Solution:**
1. Ensure JWT token is included in Authorization header
2. Token format must be: `Authorization: Bearer <token>`
3. Check token expiration time
4. Verify token was generated by login endpoint

### Issue: CORS Errors
**Symptoms:** Browser CORS blocked errors
**Solution:**
1. Add CORS filter to gateway
2. Configure allowed origins
3. Enable credentials in CORS headers

---

## CORS Configuration (Optional)

To enable CORS in the gateway, add to `application.yaml`:

```yaml
spring:
  web:
    cors:
      allowed-origins: "http://localhost:3000,http://localhost:4200"
      allowed-methods: "GET,POST,PUT,DELETE,OPTIONS"
      allowed-headers: "*"
      max-age: 3600
```

Or add a CORS filter in `application.yaml`:

```yaml
spring:
  cloud:
    gateway:
      routes:
        # ... existing routes ...
      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials
      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins: "http://localhost:3000"
            allowedMethods: "GET,POST,PUT,DELETE,OPTIONS"
            allowedHeaders: "*"
```

---

## Rate Limiting (Optional)

To add rate limiting, update `application.yaml`:

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: iam-auth
          uri: lb://iam-service
          predicates:
            - Path=/auth/**
          filters:
            - StripPrefix=0
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
                key-resolver: "#{@userKeyResolver}"
```

---

## Load Balancing Strategy

### Current Configuration
- **Type:** Round-robin (default)
- **Discovery:** Eureka (lb://)
- **Failover:** Automatic to healthy instances

### Load Balancing Examples

```yaml
# Round-robin (default)
uri: lb://iam-service

# If you want to route to specific instance:
uri: http://localhost:8081  # Direct routing (not recommended)
```

---

## Performance Optimization

### Connection Pooling
```yaml
spring:
  cloud:
    gateway:
      codec:
        max-in-memory-buffer-size: 16kb
```

### Request Timeout
```yaml
spring:
  cloud:
    gateway:
      httpclient:
        connect-timeout: 10000  # 10 seconds
```

---

## Startup Sequence

1. **Start Eureka Server** (Port 8761)
   ```bash
   cd Eureka-Server
   mvn spring-boot:run
   ```

2. **Start Microservices** (in any order)
   ```bash
   # Terminal 2+
   cd services/[service-name]
   mvn spring-boot:run
   ```

3. **Start API Gateway** (Port 8080)
   ```bash
   cd gateway
   mvn spring-boot:run
   ```

4. **Verify Registration** 
   - Visit http://localhost:8761
   - All services should appear under "Instances Currently Registered with Eureka"

---

## Summary

✅ **Gateway Configuration Complete:**
- 11 routes configured for all microservices
- Load balancing via Eureka enabled
- Service discovery working
- Ready for production use
- All endpoints accessible via single gateway (Port 8080)

**Next Steps:**
1. Start Eureka Server first
2. Start each microservice
3. Start Gateway
4. Test endpoints using curl commands provided above
5. Monitor via Eureka dashboard (localhost:8761)

