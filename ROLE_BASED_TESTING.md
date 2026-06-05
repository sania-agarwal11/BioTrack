# BioTrack Platform — Role-Based Testing Scenarios

> **10 test cases per role · 6 roles · 60 total scenarios**  
> Run the full platform first (see `FRONTEND_TESTING_GUIDE.md`).  
> URL: http://localhost:5173

---

## How to Use This Guide

For each test:
1. **Login** as the specified role account
2. Follow the **Steps** exactly
3. Verify the **Expected Result** matches what you see
4. Mark ✅ Pass or ❌ Fail

---

---

# ROLE 1 — ADMIN

**Login:** admin@biotrack.com / Admin@2024  
**Dashboard shows:** All stat cards · All activity sections · Pending approvals panel

---

### Test A-01 — Dashboard shows all statistics
| Field | Detail |
|-------|--------|
| **Steps** | 1. Login as Admin. 2. Stay on Dashboard. |
| **Expected** | Stat cards visible: Total Patients, Protocols, Total Sites, Samples, Lab Results, KPI Reports, Audit Logs, Compliance Reports. All cards are clickable and navigate to their respective pages. |

---

### Test A-02 — Create a new user account
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **User Management** (sidebar). 2. Click **+ Add User**. 3. Fill Name: `Test Lab User`, Email: `testlab@biotrack.com`, Role: `LAB_TECHNICIAN`, Password: `Test@1234`. 4. Click Save. |
| **Expected** | New user appears in the user list with role `LAB_TECHNICIAN`. No error shown. |

---

### Test A-03 — Enroll a new patient
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Patients**. 2. Click **+ Enroll Patient**. 3. Fill: First Name: `John`, Last Name: `Doe`, Date of Birth: `1985-05-15`, Gender: `MALE`, Protocol ID: (pick an existing one), Site ID: (pick an existing one), Enrollment Status: `ENROLLED`. 4. Save. |
| **Expected** | Patient appears in list with status badge `ENROLLED`. Patient count on dashboard increases by 1. |

---

### Test A-04 — Approve a pending protocol submission
| Field | Detail |
|-------|--------|
| **Steps** | 1. First login as RESEARCH_SCIENTIST and create a protocol (it will be in DRAFT status). 2. Log back in as Admin. 3. Dashboard shows **Pending Requests** panel. 4. Click **✓ Approve** on the protocol. |
| **Expected** | Protocol status changes to `ACTIVE`. Panel disappears (or item is removed). Researcher gets a notification: "Protocol Approved". |

---

### Test A-05 — Reject a pending site submission
| Field | Detail |
|-------|--------|
| **Steps** | 1. Have a RESEARCH_SCIENTIST create a site (status: `PENDING_APPROVAL`). 2. Login as Admin. 3. In the Pending Requests panel, click **✗ Reject** on the site. |
| **Expected** | Site status changes to `INACTIVE`. Researcher receives a "Site Rejected" notification on their dashboard. |

---

### Test A-06 — Delete and restore a sample
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Samples**. 2. Click the 🗑 delete icon on any sample. 3. Confirm deletion in the dialog. 4. Click **Show Deleted** toggle. 5. Click **↩ Restore** on the deleted sample. |
| **Expected** | After delete: sample disappears from the main list. After "Show Deleted": sample appears with red background. After restore: sample is back in main list. |

---

### Test A-07 — Verify audit logs record actions
| Field | Detail |
|-------|--------|
| **Steps** | 1. Perform any write action (e.g., create a patient). 2. Go to **Audit Logs** page. 3. Look for the most recent entry. |
| **Expected** | A `CREATE` audit log entry appears with your name/email, `resourceType: PATIENT`, and a timestamp within the last minute. |

---

### Test A-08 — Generate a Compliance Report
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Compliance Reports**. 2. Click **Generate Report**. 3. Select report type **Protocol Compliance (C)**. 4. Click Generate. |
| **Expected** | Report is generated and appears in the Saved Reports table with type "Protocol Compliance" and today's date. |

---

### Test A-09 — Manage user roles (edit a user's role)
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **User Management**. 2. Click **Edit** on any non-admin user. 3. Change their role from `LAB_TECHNICIAN` to `DATA_MANAGER`. 4. Save. |
| **Expected** | User's role updates in the list. When that user logs in again, their dashboard reflects the DATA_MANAGER view. |

---

### Test A-10 — View Analytics KPI Reports
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Analytics** page. 2. Browse the KPI reports list. 3. Click on one report to view details. |
| **Expected** | KPI report details load with charts/metrics. The Analytics page is fully accessible with no 403 errors. |

---
---

# ROLE 2 — CLINICAL TRIAL MANAGER (CTM)

**Login:** ctm@biotrack.com / Admin@2024  
**Dashboard shows:** Patients, Protocols, Sites stat cards · Pending Approvals panel · Recent Patients/Protocols/Sites

---

### Test C-01 — Dashboard activity sections
| Field | Detail |
|-------|--------|
| **Steps** | 1. Login as CTM. 2. Observe the Dashboard. |
| **Expected** | Stat cards: Total Patients, Protocols, Total Sites. Recent Patients, Recent Protocols, and Recent Sites section cards visible at the bottom. Quick Actions: Enroll Patient, Create Protocol, View Visits, View Sites, Notifications. |

---

### Test C-02 — Enroll a new patient
| Field | Detail |
|-------|--------|
| **Steps** | 1. Click **+ Enroll Patient** from Quick Actions or Patients page. 2. Fill all required fields. 3. Save. |
| **Expected** | Patient created and appears in Patients list. Total Patients stat increases. An audit log entry is created for this action. |

---

### Test C-03 — Schedule a patient visit
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Visits**. 2. Click **+ Schedule Visit**. 3. Select a Patient ID, visit date, and visit type. 4. Save. |
| **Expected** | Visit appears in the visits list linked to the correct patient. |

---

### Test C-04 — Approve a researcher's protocol submission
| Field | Detail |
|-------|--------|
| **Steps** | 1. Ensure a RESEARCH_SCIENTIST has submitted a protocol (status: DRAFT). 2. On CTM Dashboard, see **Pending Requests** panel. 3. Click **✓ Approve**. |
| **Expected** | Protocol changes to `ACTIVE`. Researcher receives a "Protocol Approved" notification. |

---

### Test C-05 — Approve a researcher's site submission
| Field | Detail |
|-------|--------|
| **Steps** | 1. Have a Researcher create a site. 2. On CTM Dashboard Pending Requests, click **✓ Approve** on the site. |
| **Expected** | Site status changes to `ACTIVE`. Researcher gets "Site Approved" notification. |

---

### Test C-06 — Receive admin-activity notification banner
| Field | Detail |
|-------|--------|
| **Steps** | 1. While logged in as CTM, have an Admin enroll a new patient. 2. Refresh the CTM Dashboard. |
| **Expected** | A blue notification banner appears: "New Patient Enrolled" with the message from the admin. Clicking **OK** dismisses it. |

---

### Test C-07 — View patient profile details
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Patients**. 2. Click on any patient row to open the profile view. |
| **Expected** | Full patient details panel opens: demographics, protocol, site, enrollment status, visits list. |

---

### Test C-08 — Update patient enrollment status
| Field | Detail |
|-------|--------|
| **Steps** | 1. Open a patient's profile. 2. Change enrollment status from `ENROLLED` to `ANALYZING`. 3. Save. |
| **Expected** | Status badge updates to `ANALYZING`. Dashboard enrollment summary reflects the change. |

---

### Test C-09 — CTM cannot access Samples or Lab Results
| Field | Detail |
|-------|--------|
| **Steps** | 1. As CTM, try navigating to `/samples` or `/lab-results` directly in the browser. |
| **Expected** | Page shows an empty state or redirect — CTM is not in the sidebar for those pages and backend returns `403 Forbidden`. |

---

### Test C-10 — Browse all active protocols
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Protocols**. 2. Filter by status `ACTIVE`. 3. Click on a protocol to view its detail page. |
| **Expected** | Only ACTIVE protocols appear after filtering. Protocol detail page shows: title, phase, start/end date, target patients, sites enrolled, status. |

---
---

# ROLE 3 — LAB TECHNICIAN

**Login:** lab@biotrack.com / Admin@2024  
**Dashboard shows:** Samples + Lab Results stat cards · Recent Samples + Recent Lab Results activity cards

---

### Test L-01 — Dashboard shows correct content
| Field | Detail |
|-------|--------|
| **Steps** | 1. Login as Lab Technician. 2. Observe dashboard. |
| **Expected** | Two stat cards: 🧪 Samples and 🔬 Lab Results. Below Quick Actions: two SectionCards — "Recent Samples" (last 5) and "Recent Lab Results" (last 5). Quick Actions: Add Sample, View Lab Results, Notifications. |

---

### Test L-02 — Add a new sample
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Samples** or click **+ Add Sample** from dashboard. 2. Enter Patient ID. 3. Tab out — Protocol ID and Site ID should auto-fill. 4. Select Sample Type: `BLOOD`, Collection Date: today. 5. Save. |
| **Expected** | Sample is created and appears in the samples list with status `COLLECTED`. An audit log `CREATE/SAMPLE` is recorded. |

---

### Test L-03 — Update sample status
| Field | Detail |
|-------|--------|
| **Steps** | 1. In the Samples list, find the sample created in L-02. 2. Change the status dropdown from `COLLECTED` to `IN_STORAGE`. |
| **Expected** | Status badge updates to `IN_STORAGE` immediately. An `UPDATE/SAMPLE` audit log is created. |

---

### Test L-04 — Add a lab result to a sample
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Lab Results**. 2. Click **+ Add Result**. 3. Enter Sample ID (from L-02). 4. Tab out — collection date hint appears. 5. Fill: Test Name: `Hemoglobin`, Status: `COMPLETED`, Result: `14.2`, Unit: `g/dL`, Performed Date: today or later, Performed By: `Dr. Smith`. 6. Save. |
| **Expected** | Lab result created and linked to the sample. Appears in the Lab Results list with status `COMPLETED`. |

---

### Test L-05 — Delete a lab result (soft delete)
| Field | Detail |
|-------|--------|
| **Steps** | 1. In Lab Results list, click the 🗑 delete icon on any result. 2. Confirm in the dialog. |
| **Expected** | Lab result disappears from the main list. No error. An audit log `DELETE/LAB_RESULT` is created. |

---

### Test L-06 — Show Deleted + Restore a lab result
| Field | Detail |
|-------|--------|
| **Steps** | 1. In Lab Results, click **Show Deleted** toggle (now visible for Lab Technician). 2. The deleted result from L-05 appears with a red row background. 3. Click **↩ Restore**. |
| **Expected** | After restore: the result disappears from the deleted view. Turn off "Show Deleted" — the result reappears in the normal list. Audit log `RESTORE/LAB_RESULT` created. |

---

### Test L-07 — Delete a sample (soft delete)
| Field | Detail |
|-------|--------|
| **Steps** | 1. In Samples, click 🗑 on any sample. 2. Confirm deletion. |
| **Expected** | Sample disappears from the active list. Confirmation dialog shows sample ID, patient ID, and type before deleting. |

---

### Test L-08 — Show Deleted + Restore a sample
| Field | Detail |
|-------|--------|
| **Steps** | 1. Click **Show Deleted** in Samples. 2. Deleted sample appears with a red background. 3. Click **↩ Restore**. |
| **Expected** | Sample is restored. Switch off "Show Deleted" → sample is back in the active list. |

---

### Test L-09 — View sample details (status history + lab result)
| Field | Detail |
|-------|--------|
| **Steps** | 1. In Samples, click the **👁 View** button on any sample. |
| **Expected** | A detailed modal opens showing: sample info header, status history timeline (with dates and color-coded statuses), and the linked lab result (test name, result, unit, reference range, status, notes). |

---

### Test L-10 — Lab Technician cannot access Patient or Protocol pages
| Field | Detail |
|-------|--------|
| **Steps** | 1. As Lab Technician, try navigating to `/patients`, `/protocols`, `/sites`, `/visits` in the browser. |
| **Expected** | These pages are not in the sidebar. Navigating directly either redirects or returns a 403. The Lab Technician sidebar only shows: Dashboard, Samples, Lab Results, Notifications. |

---
---

# ROLE 4 — RESEARCH SCIENTIST

**Login:** researcher@biotrack.com / Admin@2024  
**Dashboard shows:** Protocols + Sites stat cards · Recent Protocols, Recent Sites, Active Enrollments

---

### Test R-01 — Dashboard shows researcher-specific content
| Field | Detail |
|-------|--------|
| **Steps** | 1. Login as Research Scientist. 2. Observe dashboard. |
| **Expected** | Stat cards: Protocols and Total Sites. Activity sections: Recent Protocols, Recent Sites, Active Enrollments. Quick Actions: View Protocols, View Sites, Notifications. |

---

### Test R-02 — Create a new protocol (submitted for approval)
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Protocols**. 2. Click **+ Create Protocol**. 3. Fill: Title: `Cancer Screening Phase II`, Phase: `PHASE_II`, Start: 2025-01-01, End: 2026-12-31, Target Patients: 100. 4. Save. |
| **Expected** | Protocol is created with status `DRAFT`. A badge shows "DRAFT" (pending admin/CTM approval). No error. |

---

### Test R-03 — Create a new site (submitted for approval)
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Sites**. 2. Click **+ Add Site**. 3. Fill: Name: `Mumbai Research Centre`, Location: `Mumbai`, Type: `HOSPITAL`, Capacity: 50. 4. Save. |
| **Expected** | Site is created with status `PENDING_APPROVAL`. It appears in the sites list with that badge. |

---

### Test R-04 — Receive protocol approval notification banner
| Field | Detail |
|-------|--------|
| **Steps** | 1. Have an Admin or CTM approve the protocol from R-02. 2. Refresh the Research Scientist dashboard. |
| **Expected** | A green banner appears: ✅ "Protocol Approved" — "Your protocol 'Cancer Screening Phase II' has been reviewed and approved. It is now ACTIVE." Banner has an **OK** button. |

---

### Test R-05 — Receive protocol rejection notification banner
| Field | Detail |
|-------|--------|
| **Steps** | 1. Create another protocol. 2. Have Admin/CTM click Reject. 3. Refresh researcher dashboard. |
| **Expected** | An amber/orange banner appears: ⚠️ "Protocol Rejected" with the message and an **OK** button. |

---

### Test R-06 — Dismiss notification banners
| Field | Detail |
|-------|--------|
| **Steps** | 1. With an unread approval banner visible on the dashboard, click **OK**. |
| **Expected** | Banner disappears immediately and does not reappear on page refresh. The notification is marked as READ in the system. |

---

### Test R-07 — View full notifications history
| Field | Detail |
|-------|--------|
| **Steps** | 1. Click **Notifications** from Quick Actions or sidebar. |
| **Expected** | Full list of notifications appears: approval, rejection, and any other messages. Each shows title, message, timestamp, and read/unread status. |

---

### Test R-08 — View existing protocols (read-only for ACTIVE)
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Protocols**. 2. Click on an ACTIVE protocol row to open details. |
| **Expected** | Protocol detail page shows full info. No edit/delete controls for ACTIVE protocols submitted by others. Researcher can see phase, status, dates, sites. |

---

### Test R-09 — Researcher cannot access Patients, Samples, or Audit Logs
| Field | Detail |
|-------|--------|
| **Steps** | 1. As Researcher, try navigating directly to `/patients`, `/samples`, `/audit-logs`. |
| **Expected** | These links don't appear in the sidebar. Direct navigation either shows empty/403 or redirects. Researcher sidebar shows: Dashboard, Protocols, Sites, Notifications. |

---

### Test R-10 — Active Enrollments section on dashboard
| Field | Detail |
|-------|--------|
| **Steps** | 1. On the Researcher dashboard, scroll to the **Active Enrollments** section card. |
| **Expected** | Shows patients with enrollment status ENROLLED, ANALYZING, or SCREENING. Each row shows patient name, protocol ID, and enrollment status badge. Clicking a row navigates to that patient's profile. |

---
---

# ROLE 5 — REGULATORY OFFICER

**Login:** regoff@biotrack.com / Admin@2024  
**Dashboard shows:** Audit Logs + Compliance Reports stat cards · Recent Audit Logs + Recent Compliance Reports

---

### Test O-01 — Dashboard shows regulatory content
| Field | Detail |
|-------|--------|
| **Steps** | 1. Login as Regulatory Officer. 2. Observe dashboard. |
| **Expected** | Two stat cards: 🗒️ Audit Logs and 📄 Compliance Reports. Two Recent Activity section cards below Quick Actions. Quick Actions: Generate Report, Audit Logs, Notifications. |

---

### Test O-02 — Recent Audit Logs section shows latest entries
| Field | Detail |
|-------|--------|
| **Steps** | 1. On dashboard, look at the **Recent Audit Logs** section card. |
| **Expected** | Up to 5 most recent audit entries shown. Each row: user name, role label, resource + ID, timestamp, action badge (color-coded: green=CREATE, blue=UPDATE, red=DELETE, amber=RESTORE). Clicking any row navigates to Audit Logs page. |

---

### Test O-03 — Browse and filter Audit Logs
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Audit Logs** page. 2. Filter by Action: `CREATE`. 3. Then filter by Role: `LAB_TECHNICIAN`. |
| **Expected** | Only CREATE actions by Lab Technicians are shown. Count label updates accordingly. Clearing filters restores all logs. |

---

### Test O-04 — Verify RESTORE actions are now recorded
| Field | Detail |
|-------|--------|
| **Steps** | 1. Have a Lab Technician delete and restore a sample. 2. Go to Audit Logs page. 3. Look for entries with action `RESTORE`. |
| **Expected** | A RESTORE entry appears with `resourceType: SAMPLE`, the correct sample ID, and the Lab Technician's name. |

---

### Test O-05 — Recent Compliance Reports section on dashboard
| Field | Detail |
|-------|--------|
| **Steps** | 1. On the Regulatory Officer dashboard, view the **Recent Compliance Reports** card. |
| **Expected** | Up to 5 most recent reports shown. Each row: report type icon + title, RPT-XXXX ID, generated by + date. Clicking navigates to Compliance Reports page. |

---

### Test O-06 — Generate an Audit Trail Report
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Compliance Reports**. 2. Click **Generate Report**. 3. Select **Audit Trail Report (A)**. 4. Click Generate. |
| **Expected** | Report generates with charts showing total actions, action breakdown, top active users. The report appears in the Saved Reports table with type "Audit Trail Report". |

---

### Test O-07 — Generate a Security & Access Compliance Report
| Field | Detail |
|-------|--------|
| **Steps** | 1. On Compliance Reports page, generate report type **Security & Access Compliance (G)**. |
| **Expected** | Report shows: login activity by role, recent logins table, access stats. Export to CSV button is available. |

---

### Test O-08 — Export a Compliance Report as CSV
| Field | Detail |
|-------|--------|
| **Steps** | 1. Generate any report (e.g., Data Change History). 2. Click **Export CSV** button within the report view. |
| **Expected** | A `.csv` file downloads to your computer containing the report data in tabular format. |

---

### Test O-09 — Export a Compliance Report as PDF
| Field | Detail |
|-------|--------|
| **Steps** | 1. From an active report view, click **Export PDF**. |
| **Expected** | A PDF file is generated and downloaded. It contains charts and tables matching what's shown on screen. |

---

### Test O-10 — Regulatory Officer cannot access Patients, Samples, or Analytics
| Field | Detail |
|-------|--------|
| **Steps** | 1. As Regulatory Officer, navigate to `/patients`, `/samples`, `/analytics`. |
| **Expected** | These are not in the sidebar. Backend returns `403`. Sidebar shows only: Dashboard, Audit Logs, Compliance Reports, Notifications. |

---
---

# ROLE 6 — DATA MANAGER

**Login:** datamanager@biotrack.com / Admin@2024  
**Dashboard shows:** KPI Reports stat card · Quick Actions: View Analytics, Notifications

---

### Test D-01 — Dashboard shows Data Manager content
| Field | Detail |
|-------|--------|
| **Steps** | 1. Login as Data Manager. 2. Observe dashboard. |
| **Expected** | One stat card: 📈 KPI Reports. Quick Actions include: View Analytics and Notifications. No patient, sample, or protocol sections. |

---

### Test D-02 — Navigate to Analytics page
| Field | Detail |
|-------|--------|
| **Steps** | 1. Click **View Analytics** from Quick Actions. |
| **Expected** | Analytics page opens listing all KPI reports. Data Manager has full read and write access to KPI reports. |

---

### Test D-03 — Create a new KPI Report
| Field | Detail |
|-------|--------|
| **Steps** | 1. On Analytics page, click **+ Create Report** (or equivalent button). 2. Fill required fields (report name, metrics, time period). 3. Save. |
| **Expected** | New KPI report appears in the list. KPI Reports count on dashboard increases by 1. |

---

### Test D-04 — View an existing KPI Report details
| Field | Detail |
|-------|--------|
| **Steps** | 1. On Analytics page, click on any KPI report row. |
| **Expected** | Report detail view opens with charts, metric values, and time period info. |

---

### Test D-05 — Edit a KPI Report
| Field | Detail |
|-------|--------|
| **Steps** | 1. Click the edit icon on any KPI report. 2. Modify a field. 3. Save. |
| **Expected** | Updated values are reflected in the list and detail view. |

---

### Test D-06 — Delete a KPI Report
| Field | Detail |
|-------|--------|
| **Steps** | 1. Click the delete icon on a KPI report. 2. Confirm in the dialog. |
| **Expected** | Report is removed from the list. KPI Reports stat count decreases. |

---

### Test D-07 — Data Manager cannot access Patient or Sample data
| Field | Detail |
|-------|--------|
| **Steps** | 1. As Data Manager, navigate directly to `/patients`, `/samples`, `/lab-results`. |
| **Expected** | These pages are not in the sidebar. Backend returns `403 Forbidden` for those endpoints. Data Manager sidebar shows: Dashboard, Analytics, Notifications. |

---

### Test D-08 — Data Manager cannot access Audit Logs
| Field | Detail |
|-------|--------|
| **Steps** | 1. Navigate directly to `/audit-logs`. |
| **Expected** | Page is inaccessible — `403` or redirect. Only ADMIN and REGULATORY_OFFICER can view audit logs. |

---

### Test D-09 — Notifications are accessible
| Field | Detail |
|-------|--------|
| **Steps** | 1. Go to **Notifications** from the sidebar or Quick Actions. |
| **Expected** | Notifications page loads. Data Manager can view their own notifications (all roles can access this page). |

---

### Test D-10 — KPI stat card navigates to Analytics page
| Field | Detail |
|-------|--------|
| **Steps** | 1. On dashboard, click the **📈 KPI Reports** stat card. |
| **Expected** | Navigates to `/analytics` page. The card shows a count of KPI reports and has a hover shadow effect before clicking. |

---
---

## Cross-Role Integration Tests

These tests require **two browser windows / incognito sessions** open simultaneously.

| Test | Description | Roles Involved |
|------|-------------|----------------|
| **INT-01** | Researcher creates protocol → CTM sees it in Pending Requests → CTM approves → Researcher's dashboard shows green banner | RESEARCH_SCIENTIST + CTM |
| **INT-02** | Admin enrolls patient → CTM dashboard shows "New Patient Enrolled" banner | ADMIN + CTM |
| **INT-03** | Lab Technician creates sample → Regulatory Officer sees new CREATE audit log on dashboard | LAB_TECH + REG_OFFICER |
| **INT-04** | Lab Technician restores a deleted sample → Regulatory Officer sees RESTORE audit entry | LAB_TECH + REG_OFFICER |
| **INT-05** | Admin generates compliance report → Regulatory Officer dashboard "Recent Reports" count increases | ADMIN + REG_OFFICER |

---

## Negative / Security Tests

These verify that role permissions are enforced at the **backend** level too (not just UI hiding):

| Test | Action | Expected |
|------|--------|---------|
| **SEC-01** | Lab Technician tries to call `GET /api/v1/patients` with their JWT | `403 Forbidden` |
| **SEC-02** | Research Scientist calls `DELETE /api/v1/samples/1` | `403 Forbidden` |
| **SEC-03** | Data Manager calls `GET /api/v1/audit-logs` | `403 Forbidden` |
| **SEC-04** | Unauthenticated request to any protected endpoint | `401 Unauthorized` |
| **SEC-05** | Expired JWT (wait 8 hours or change token manually) → try login | Login succeeds, new token issued |

---

*BioTrack Platform · Role-Based Testing Scenarios · June 2026*
