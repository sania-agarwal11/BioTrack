# API Gateway - Architecture & Routes Visual Reference

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT APPLICATIONS                              │
│  (Web Browser, Mobile App, Desktop Client, External Systems)             │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 │ HTTP/REST Requests
                                 ▼
        ┌────────────────────────────────────────────────┐
        │                                                │
        │   🌐 API GATEWAY (Port 8080)                  │
        │   Spring Cloud Gateway                         │
        │                                                │
        │   Functions:                                   │
        │   • Route requests to services                │
        │   • Load balancing                            │
        │   • Service discovery                         │
        │   • Request/Response transformation           │
        │                                                │
        └────────────────────┬───────────────────────────┘
                             │
        ┌────────────────────┴──────────────────────┐
        │                                           │
        │  Service Discovery & Load Balancing      │
        │  via Eureka (localhost:8761)            │
        │                                           │
        └────────────────────┬──────────────────────┘
                             │
        ┌────────────────────┴────────────────────────────────────────────────┐
        │                                                                      │
        ▼                ▼                ▼                ▼                  ▼
   ┌─────────┐     ┌──────────┐    ┌──────────┐    ┌──────────┐        ┌──────────┐
   │   IAM   │     │ PATIENT  │    │  SAMPLE  │    │PROTOCOL  │        │ NOTIFS   │
   │ SERVICE │     │ SERVICE  │    │ SERVICE  │    │ SERVICE  │        │ SERVICE  │
   │:8081    │     │:8082     │    │:8083     │    │:8086     │        │:8084     │
   └────┬────┘     └────┬─────┘    └────┬─────┘    └────┬─────┘        └────┬─────┘
        │               │               │               │                   │
   ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐        ┌──────────┐
   │biotrack_iam │  │biotrack_ │  │biotrack_ │  │biotrack_   │        │biotrack_ │
   │  database   │  │ patient  │  │  sample  │  │  protocol  │        │notifs db │
   │             │  │  database│  │ database │  │  database  │        │          │
   └─────────────┘  └──────────┘  └──────────┘  └─────────────┘        └──────────┘
        │               │               │               │                   │
        └─────────────┬─────────────────┴───────────────┴───────────────────┘
                      │
                 User Authentication
                 JWT Tokens
                 Role-Based Access
```

---

## Route Mapping Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (8080)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  /auth/**              ──→ IAM-Service (8081)                           │
│  /users/**             ──→ IAM-Service (8081)                           │
│                                                                          │
│  /patients/**          ──→ Patient-Service (8082)                       │
│  /sites/**             ──→ Patient-Service (8082)                       │
│  /visits/**            ──→ Patient-Service (8082)                       │
│                                                                          │
│  /samples/**           ──→ Sample-Service (8083)                        │
│  /lab-results/**       ──→ Sample-Service (8083)                        │
│                                                                          │
│  /protocols/**         ──→ Protocol-Service (8086)                      │
│                                                                          │
│  /notifications/**     ──→ Notifications-Service (8084)                 │
│                                                                          │
│  /compliance/**        ──→ Compliance-Service (8085)                    │
│  /audit-logs/**        ──→ Compliance-Service (8085)                    │
│                                                                          │
│  /kpi-reports/**       ──→ Analytics-Service (8087)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Request Flow Diagram

```
┌──────────────┐
│ Client sends │
│ HTTP request │
│ to gateway   │
└───────┬──────┘
        │
        │ POST /auth/login
        │ Content-Type: application/json
        │
        ▼
   ┌─────────────────────────┐
   │  Path Predicate Check   │
   │  Pattern: /auth/**      │
   │  Action: MATCH          │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Eureka Lookup          │
   │  Service: iam-service   │
   │  Find healthy instances │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Load Balancer          │
   │  (Round-robin)          │
   │  Select instance        │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Route to Service       │
   │ POST http://localhost.. │
   │ :8081/auth/login        │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Service Processes      │
   │  Request (JWT token)    │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Response to Gateway    │
   │ {token: "eyJ..."}       │
   └────────┬────────────────┘
            │
            ▼
   ┌─────────────────────────┐
   │  Gateway Forwards       │
   │ Response to Client      │
   └────────┬────────────────┘
            │
            ▼
   ┌──────────────┐
   │ Client gets  │
   │ JWT token    │
   └──────────────┘
```

---

## Service Registration Flow (Startup)

```
┌──────────────────┐
│  Start Eureka    │
│  Server (8761)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│         Eureka Service Registry Started                  │
│    (Ready to receive service registrations)              │
└──────────────────────────────────────────────────────────┘
         │
         ├─────────────────────────────────────────────────────┐
         │                                                      │
         ▼                                                      ▼
┌──────────────────┐                            ┌──────────────────────┐
│  IAM-Service     │                            │ Other Microservices  │
│  starts up       │                            │ (Patient, Sample,    │
│  @EurekaClient   │                            │  Protocol, etc)      │
└────────┬─────────┘                            └──────────┬───────────┘
         │                                                   │
         │ "Register me with Eureka"                        │ (Same process)
         │ Service: iam-service                             │
         │ Port: 8081                                       │
         │                                                   │
         └─────────────────┬──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │      Eureka Service Registry             │
        ├──────────────────────────────────────────┤
        │ ✅ iam-service              (8081)      │
        │ ✅ patient-service          (8082)      │
        │ ✅ sample-service           (8083)      │
        │ ✅ protocol-service         (8086)      │
        │ ✅ notifications-service    (8084)      │
        │ ✅ compliance-service       (8085)      │
        │ ✅ analytics-service        (8087)      │
        │ ✅ gateway                  (8080)      │
        └──────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │ Gateway looks up "iam-service"           │
        │ Finds: localhost:8081                    │
        │ Routes /auth/** to http://localhost:8081│
        └──────────────────────────────────────────┘
```

---

## Authentication & Authorization Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /auth/register
       │    (Unencrypted path)
       ▼
┌──────────────────┐
│  API Gateway     │
│  (No auth check) │
└────────┬─────────┘
         │ Route to iam-service
         ▼
┌──────────────────────────┐
│   IAM-Service            │
│   Encrypt password       │
│   Save to database       │
└────────┬─────────────────┘
         │ Return user info
         ▼
┌──────────────────┐
│  Client stores   │
│  token locally   │
└────────┬─────────┘
         │
         │ 2. GET /users
         │    Authorization: Bearer <token>
         ▼
┌──────────────────┐
│  API Gateway     │
│  (JWT Filter)    │
│  Check token    │
└────────┬─────────┘
         │ Valid? YES
         ▼
┌──────────────────────────┐
│  Extract claims from     │
│  token:                  │
│  - username              │
│  - authorities (roles)   │
└────────┬─────────────────┘
         │
         │ Route to iam-service
         ▼
┌──────────────────────────┐
│   IAM-Service            │
│   Check user role        │
│   Return user list       │
│   (Filtered by role)     │
└────────┬─────────────────┘
         │ Response to Gateway
         ▼
┌──────────────────┐
│  API Gateway     │
│  Forward response
│  to client       │
└──────────────────┘
```

---

## Load Balancing Scenario

```
Gateway discovers 3 instances of patient-service:

┌─────────────────────────────────────────────────────┐
│             Eureka Registry                         │
│  patient-service:                                   │
│    Instance 1: localhost:8082 (HEALTHY)            │
│    Instance 2: localhost:8082 (HEALTHY)            │
│    Instance 3: localhost:8082 (HEALTHY)            │
└─────────────────────────────────────────────────────┘


Requests distribution (Round-robin):

Request 1: GET /patients     ──→ Instance 1
Request 2: GET /patients     ──→ Instance 2
Request 3: GET /patients     ──→ Instance 3
Request 4: GET /patients     ──→ Instance 1
Request 5: GET /patients     ──→ Instance 2
...


If Instance 2 goes down:

┌─────────────────────────────────────────────────────┐
│             Eureka Registry                         │
│  patient-service:                                   │
│    Instance 1: localhost:8082 (HEALTHY)            │
│    Instance 2: localhost:8082 (DOWN) ✗             │
│    Instance 3: localhost:8082 (HEALTHY)            │
└─────────────────────────────────────────────────────┘

Gateway automatically skips Instance 2:

Request 1: GET /patients     ──→ Instance 1
Request 2: GET /patients     ──→ Instance 3
Request 3: GET /patients     ──→ Instance 1
Request 4: GET /patients     ──→ Instance 3
...

(Instance 2 automatically removed from rotation)
```

---

## Complete Request Lifecycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE REQUEST LIFECYCLE                         │
└────────────────────────────────────────────────────────────────────────┘

1. CLIENT
   ├─ Prepares HTTP request
   ├─ Adds Authorization header (Bearer token)
   └─ Sends to http://localhost:8080/patients

2. API GATEWAY (Port 8080)
   ├─ Receives request
   ├─ Applies default filters (CORS, dedup headers)
   ├─ Matches path /patients/** to route
   ├─ Identifies target service: patient-service
   ├─ Looks up patient-service in Eureka registry
   ├─ Gets: [localhost:8082, localhost:8082, localhost:8082]
   ├─ Load balances (round-robin)
   ├─ Routes to selected instance
   └─ Request forwarded

3. PATIENT-SERVICE (Port 8082)
   ├─ Receives request from gateway
   ├─ Applies Security filter
   ├─ Validates JWT token
   ├─ Extracts user authorities
   ├─ Checks permissions
   ├─ Controller processes request
   ├─ Service layer executes business logic
   ├─ Repository queries database
   └─ Builds response

4. PATIENT-SERVICE Response
   ├─ Returns response with status code
   ├─ Includes data (patients list, etc.)
   └─ Sends to gateway

5. API GATEWAY Return
   ├─ Receives response from service
   ├─ Applies filters (dedup headers)
   ├─ Forwards to client
   └─ Connection closed

6. CLIENT
   ├─ Receives response
   ├─ Parses JSON
   ├─ Updates UI
   └─ Ready for next request
```

---

## Performance & Scaling

```
┌────────────────────────────────────────────────────────────────────┐
│                    SCALABLE ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────┘

                    Multiple Instances (Load Balanced)

Gateway Discovery:
    ┌─────────────────────────────────────────────────────┐
    │  Find all instances of patient-service in Eureka    │
    │  Load balance across all healthy instances          │
    │  Automatic failover if instance goes down           │
    └─────────────────────────────────────────────────────┘

Scaling Up (Add More Instances):
    
    New Instance starts → Registers with Eureka
                        ↓
    Gateway automatically includes in load balancing
                        ↓
    All new requests distributed to new instance


Scaling Down (Remove Instances):
    
    Instance stops → Eureka marks as DOWN
                  ↓
    Gateway automatically routes away from instance
                  ↓
    Existing connections drain gracefully
                  ↓
    New requests go to remaining instances


Example Deployment:
    
    gateway (1 instance needed)
    iam-service (2-3 instances)
    patient-service (3-5 instances)  
    sample-service (2-3 instances)
    protocol-service (1-2 instances)
    notifications-service (1-2 instances)
    compliance-service (1-2 instances)
    analytics-service (1-2 instances)
    
    Each can scale independently!
```

---

## Configuration Cheat Sheet

| Component | Port | Status | Configuration |
|-----------|------|--------|---|
| Eureka Server | 8761 | ✅ | No configuration needed |
| API Gateway | 8080 | ✅ | `gateway/application.yaml` |
| IAM Service | 8081 | ✅ | `services/iam-service/application.yaml` |
| Patient Service | 8082 | ⏳ | `services/patient-service/application.yaml` |
| Sample Service | 8083 | ⏳ | `services/sample-service/application.yaml` |
| Protocol Service | 8086 | ⏳ | `services/protocol-service/application.yaml` |
| Notifications Service | 8084 | ⏳ | `services/notifications-service/application.yaml` |
| Compliance Service | 8085 | ⏳ | `services/compliance-service/application.yaml` |
| Analytics Service | 8087 | ⏳ | `services/analytics-service/application.yaml` |

---

**Gateway Configuration: ✅ COMPLETE**

All routes configured and ready for microservices!

