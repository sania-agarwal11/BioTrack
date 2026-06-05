# BioTrack Platform — Frontend Testing Guide

> **Last Updated:** June 2026  
> **Status:** All 7 microservices + React frontend — fully operational  
> **Stack:** Spring Boot 3.3.5 · Spring Cloud 2023.0.3 · React 18 · MySQL 8 · Java 17

---

## 1. System Architecture (Current State)

```
Browser (React Frontend — Port 5173)
        │
        ▼
API Gateway (Port 8080)  ←──── single entry point for all API calls
        │
        ├──▶ IAM-Service          (Port 8081)  — Auth, Users, JWT
        ├──▶ Patient-Service      (Port 8082)  — Patients, Visits
        ├──▶ Sample-Service       (Port 8083)  — Samples, Lab Results
        ├──▶ Notifications-Service(Port 8084)  — Notifications
        ├──▶ Compliance-Service   (Port 8085)  — Audit Logs, Compliance Reports
        ├──▶ Protocol-Service     (Port 8086)  — Protocols, Sites
        └──▶ Analytics-Service    (Port 8087)  — KPI Reports

Eureka Server (Port 8761) — Service Registry (all services auto-register)
```

---

## 2. Prerequisites

| Tool | Required Version | Check Command |
|------|-----------------|---------------|
| Java | 17+ | `java -version` |
| Maven | 3.8+ | `mvn -version` |
| Node.js | 18+ | `node -version` |
| MySQL | 8.0+ | `mysql --version` |

---

## 3. Database Setup (One-time)

Open MySQL and run:

```sql
CREATE DATABASE IF NOT EXISTS biotrack_iam;
CREATE DATABASE IF NOT EXISTS biotrack_patient;
CREATE DATABASE IF NOT EXISTS biotrack_sample;
CREATE DATABASE IF NOT EXISTS biotrack_protocol;
CREATE DATABASE IF NOT EXISTS biotrack_notifications;
CREATE DATABASE IF NOT EXISTS biotrack_compliance;
CREATE DATABASE IF NOT EXISTS biotrack_analytics;
```

**Credentials used by all services:**
```
Host:     localhost:3306
Username: root
Password: password
```
> If your MySQL uses a different password, update `application.yaml` in each service under `spring.datasource.password`.

---

## 4. Service Startup Order

Start each in a **separate terminal**. Wait for "Started … in X seconds" before moving to the next.

### Step 1 — Eureka Server (Service Registry)
```bash
cd Biotrack-platform/Eureka-Server
mvn spring-boot:run
```
**Verify:** Open http://localhost:8761 → you should see the Eureka dashboard.

---

### Step 2 — IAM Service (Authentication)
```bash
cd Biotrack-platform/services/Iam-service
mvn spring-boot:run
```
Port: **8081** — Handles login, register, JWT, user management.

---

### Step 3 — Patient Service
```bash
cd Biotrack-platform/services/patient-service
mvn spring-boot:run
```
Port: **8082** — Handles patients and visits.

---

### Step 4 — Sample Service
```bash
cd Biotrack-platform/services/sample-service
mvn spring-boot:run
```
Port: **8083** — Handles samples and lab results.

---

### Step 5 — Notifications Service
```bash
cd Biotrack-platform/services/notifications-service
mvn spring-boot:run
```
Port: **8084** — Handles in-app notifications.

---

### Step 6 — Compliance Service
```bash
cd Biotrack-platform/services/compliance-service
mvn spring-boot:run
```
Port: **8085** — Handles audit logs and compliance reports.

---

### Step 7 — Protocol Service
```bash
cd Biotrack-platform/services/protocol-service
mvn spring-boot:run
```
Port: **8086** — Handles protocols and research sites.

---

### Step 8 — Analytics Service
```bash
cd Biotrack-platform/services/analytics-service
mvn spring-boot:run
```
Port: **8087** — Handles KPI reports and analytics.

---

### Step 9 — API Gateway (start LAST)
```bash
cd Biotrack-platform/gateway
mvn spring-boot:run
```
Port: **8080** — Routes all frontend requests to the correct service.

**Verify all registered:** Visit http://localhost:8761 — all 7 services + gateway should appear as registered instances.

---

### Step 10 — React Frontend
```bash
cd biotrack-frontend
npm install        # first time only
npm run dev
```
**Access:** http://localhost:5173

---

## 5. First-Time Setup — Create the Admin Account

On first run the database is empty. Create the admin user via the registration page or directly:

**Option A — via the app UI:**
1. Go to http://localhost:5173
2. Click **Register**
3. Fill in:
   - Name: `Admin User`
   - Email: `admin@biotrack.com`
   - Password: `Admin@2024`
   - Role: `ADMIN`
4. Click Register → you are auto-logged in.

**Option B — via API (curl):**
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@biotrack.com",
    "password": "Admin@2024",
    "role": "ADMIN"
  }'
```

---

## 6. Recommended Test Accounts (Create as Admin)

Once logged in as Admin, go to **User Management** and create one account per role:

| Role | Suggested Email | Password |
|------|----------------|----------|
| ADMIN | admin@biotrack.com | Admin@2024 |
| CLINICAL_TRIAL_MANAGER | ctm@biotrack.com | Admin@2024 |
| LAB_TECHNICIAN | lab@biotrack.com | Admin@2024 |
| RESEARCH_SCIENTIST | researcher@biotrack.com | Admin@2024 |
| REGULATORY_OFFICER | regoff@biotrack.com | Admin@2024 |
| DATA_MANAGER | datamanager@biotrack.com | Admin@2024 |

---

## 7. Service Port & URL Reference

| Service | Port | Base URL |
|---------|------|----------|
| Frontend | 5173 | http://localhost:5173 |
| API Gateway | 8080 | http://localhost:8080 |
| IAM Service | 8081 | http://localhost:8081 |
| Patient Service | 8082 | http://localhost:8082 |
| Sample Service | 8083 | http://localhost:8083 |
| Notifications | 8084 | http://localhost:8084 |
| Compliance | 8085 | http://localhost:8085 |
| Protocol Service | 8086 | http://localhost:8086 |
| Analytics | 8087 | http://localhost:8087 |
| Eureka | 8761 | http://localhost:8761 |

All frontend API calls go through **port 8080** (gateway).

---

## 8. Frontend Page → API Mapping

| Frontend Page | API Endpoint | Service |
|--------------|-------------|---------|
| `/` Dashboard | multiple | all |
| `/patients` | `GET /api/v1/patients` | patient-service |
| `/patients/:id` | `GET /api/v1/patients/{id}` | patient-service |
| `/visits` | `GET /api/v1/visits` | patient-service |
| `/protocols` | `GET /api/v1/protocols` | protocol-service |
| `/protocols/:id` | `GET /api/v1/protocols/{id}` | protocol-service |
| `/sites` | `GET /api/v1/sites` | protocol-service |
| `/samples` | `GET /api/v1/samples` | sample-service |
| `/lab-results` | `GET /api/v1/lab-results` | sample-service |
| `/audit-logs` | `GET /api/v1/audit-logs` | compliance-service |
| `/compliance-reports` | `GET /api/v1/compliance-reports` | compliance-service |
| `/analytics` | `GET /api/v1/kpi-reports` | analytics-service |
| `/notifications` | `GET /api/v1/notifications/user/{id}` | notifications-service |
| `/users` | `GET /api/v1/users` | iam-service |

---

## 9. Role-Based Access Summary

| Page / Feature | ADMIN | CTM | LAB_TECH | RESEARCHER | REG_OFFICER | DATA_MGR |
|---------------|-------|-----|----------|------------|------------|---------|
| Dashboard | ✅ Full | ✅ Patients/Protocols/Sites | ✅ Samples/Lab Results | ✅ Protocols/Sites | ✅ Audit/Compliance | ✅ KPIs |
| Patients | ✅ CRUD | ✅ CRUD | ❌ | ❌ (read via samples) | ❌ | ❌ |
| Visits | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | ❌ |
| Protocols | ✅ CRUD+Approve | ✅ CRUD+Approve | ❌ | ✅ Create (pending) | ❌ | ❌ |
| Sites | ✅ CRUD+Approve | ✅ CRUD+Approve | ❌ | ✅ Create (pending) | ❌ | ❌ |
| Samples | ✅ Full+Delete+Restore | ❌ | ✅ Full+Delete+Restore | ❌ | ❌ | ❌ |
| Lab Results | ✅ Full+Delete+Restore | ❌ | ✅ Full+Delete+Restore | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Compliance Reports | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Analytics | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Users | ✅ CRUD | ❌ | ❌ | ❌ | ❌ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 10. JWT Token Details

- **Algorithm:** HS256
- **Expiry:** 8 hours (configurable via `jwt.expiration-ms` in IAM service `application.yaml`)
- **Claims:** `sub` (email), `authorities`, `userId`, `userName`, `userRole`
- **After expiry:** Log out and log back in — the session will auto-expire and redirect to login

---

## 11. File Logging

Each service writes logs to its own `logs/` folder:
```
services/
  Iam-service/logs/iam-service.log
  patient-service/logs/patient-service.log
  sample-service/logs/sample-service.log
  ...
```
Logs rotate daily + at 10 MB. Archives are gzipped under `logs/archived/`.  
> **Note:** Log files appear only after services are started (the `logs/` folder contains a `.gitkeep` placeholder before first run).

---

## 12. Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Login shows "Invalid email or password" | Wrong credentials OR MySQL password mismatch | Double-check credentials; verify `spring.datasource.password` |
| Dashboard shows "Service offline" for a card | That microservice isn't running | Start the relevant service |
| Blank page / redirect loop | Stale JWT in browser | Hard refresh or clear localStorage |
| `403 Forbidden` on an action | Role doesn't have permission | Check the Role-Based Access table above |
| Port 8080 connection refused | Gateway not started | Start gateway last, after all services |
| Eureka shows service as DOWN | Service crashed during startup | Check that service's terminal for stack trace |
| Log files not appearing in `logs/` | Service not yet restarted after logback change | Restart all services |
| RESTORE actions not in Audit Logs | Old compliance-service version | Rebuild and restart compliance-service |
| Notifications not delivered | Notifications-service offline | Start notifications-service |

---

## 13. Swagger / API Docs (per service)

Each service exposes a Swagger UI at:
```
http://localhost:{PORT}/swagger-ui/index.html
```
Example:
- IAM: http://localhost:8081/swagger-ui/index.html
- Sample: http://localhost:8083/swagger-ui/index.html
- Compliance: http://localhost:8085/swagger-ui/index.html

---

## 14. Audit Logging Behavior

Every CREATE, UPDATE, DELETE, and RESTORE action on any entity automatically creates an entry in the Audit Logs (compliance-service). Visible at:
- Dashboard → Regulatory Officer's "Recent Audit Logs" section
- `/audit-logs` page (ADMIN and REGULATORY_OFFICER only)

---

## 15. Quick Health Check

After starting all services, run this to confirm the gateway is routing correctly:

```bash
# Should return login response (even with wrong creds it proves routing works)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biotrack.com","password":"Admin@2024"}'
```

Expected: JSON with `"token"` field.
