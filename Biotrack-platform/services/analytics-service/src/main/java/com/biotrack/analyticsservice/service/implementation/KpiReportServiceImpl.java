package com.biotrack.analyticsservice.service.implementation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.biotrack.analyticsservice.client.AuditClient;
import com.biotrack.analyticsservice.client.NotificationClient;
import com.biotrack.analyticsservice.client.PatientClient;
import com.biotrack.analyticsservice.client.ProtocolClient;
import com.biotrack.analyticsservice.client.SampleClient;
import com.biotrack.analyticsservice.dto.AuditEventDTO;
import com.biotrack.analyticsservice.dto.external.LabResultSummaryDTO;
import com.biotrack.analyticsservice.dto.external.NotificationSummaryDTO;
import com.biotrack.analyticsservice.dto.external.PatientSummaryDTO;
import com.biotrack.analyticsservice.dto.external.ProtocolSummaryDTO;
import com.biotrack.analyticsservice.dto.external.SampleSummaryDTO;
import com.biotrack.analyticsservice.dto.external.SiteSummaryDTO;
import com.biotrack.analyticsservice.dto.external.VisitSummaryDTO;
import com.biotrack.analyticsservice.dto.request.KpiReportRequestDTO;
import com.biotrack.analyticsservice.dto.response.DashboardResponseDTO;
import com.biotrack.analyticsservice.dto.response.KpiReportResponseDTO;
import com.biotrack.analyticsservice.dto.response.StudyProgressDTO;
import com.biotrack.analyticsservice.entity.KpiReport;
import com.biotrack.analyticsservice.enums.KpiTrackingType;
import com.biotrack.analyticsservice.exception.IdNotFoundException;
import com.biotrack.analyticsservice.repository.KpiReportRepository;
import com.biotrack.analyticsservice.service.KpiReportService;

@Service
public class KpiReportServiceImpl implements KpiReportService {

    @Autowired
    private KpiReportRepository kpiReportRepository;

    @Autowired
    private AuditClient auditClient;

    @Autowired
    private PatientClient patientClient;

    @Autowired
    private ProtocolClient protocolClient;

    @Autowired
    private SampleClient sampleClient;

    @Autowired
    private NotificationClient notificationClient;

    // ── Manual CRUD ─────────────────────────────────────────────────────────────

    @Override
    public KpiReportResponseDTO addKpiReport(KpiReportRequestDTO dto) {
        KpiReport report = new KpiReport();
        report.setReportName(dto.getReportName());
        report.setScope(KpiTrackingType.valueOf(dto.getScope()));
        report.setMetricName(dto.getMetricName());
        report.setMetricValue(dto.getMetricValue());
        report.setUnit(dto.getUnit());
        report.setGeneratedDate(LocalDate.parse(
                dto.getGeneratedDate() != null && !dto.getGeneratedDate().isEmpty()
                        ? dto.getGeneratedDate()
                        : LocalDate.now().toString()
        ));
        report.setMetrics(""); // legacy column kept for DB compatibility
        KpiReport saved = kpiReportRepository.save(report);
        audit("CREATE", saved.getReportId());
        return toResponseDTO(saved);
    }

    @Override
    public List<KpiReportResponseDTO> getAllKpiReports() {
        return kpiReportRepository.findAll().stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public KpiReportResponseDTO getKpiReportById(Long id) throws IdNotFoundException {
        KpiReport report = kpiReportRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("KpiReport not found with id: " + id));
        return toResponseDTO(report);
    }

    @Override
    public KpiReportResponseDTO updateKpiReport(Long id, KpiReportRequestDTO dto) throws IdNotFoundException {
        KpiReport report = kpiReportRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("KpiReport not found with id: " + id));

        report.setReportName(dto.getReportName());
        report.setScope(KpiTrackingType.valueOf(dto.getScope()));
        report.setMetricName(dto.getMetricName());
        report.setMetricValue(dto.getMetricValue());
        report.setUnit(dto.getUnit());
        if (dto.getGeneratedDate() != null && !dto.getGeneratedDate().isEmpty()) {
            report.setGeneratedDate(LocalDate.parse(dto.getGeneratedDate()));
        }
        if (report.getMetrics() == null) {
            report.setMetrics("");
        }

        KpiReport updated = kpiReportRepository.save(report);
        audit("UPDATE", updated.getReportId());
        return toResponseDTO(updated);
    }

    @Override
    public String deleteKpiReport(Long id) throws IdNotFoundException {
        KpiReport report = kpiReportRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("KpiReport not found with id: " + id));
        kpiReportRepository.delete(report);
        audit("DELETE", id);
        return "KpiReport deleted successfully with ID: " + id;
    }

    @Override
    public List<KpiReportResponseDTO> getReportsByScope(KpiTrackingType scope) {
        return kpiReportRepository.findByScope(scope).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    // ── Auto-Generate ────────────────────────────────────────────────────────────

    @Override
    public List<KpiReportResponseDTO> autoGenerateKpiReports() {
        List<KpiReportResponseDTO> generated = new ArrayList<>();
        generated.addAll(generatePatientKpis());
        generated.addAll(generateVisitKpis());
        generated.addAll(generateProtocolKpis());
        generated.addAll(generateSiteKpis());
        generated.addAll(generateSampleKpis());
        generated.addAll(generateLabResultKpis());
        generated.addAll(generateNotificationKpis());
        return generated;
    }

    @Override
    public List<KpiReportResponseDTO> autoGenerateKpiReportsByScope(String scope) {
        return switch (scope.toUpperCase()) {
            case "PATIENT"      -> generatePatientKpis();
            case "VISIT"        -> generateVisitKpis();
            case "PROTOCOL"     -> generateProtocolKpis();
            case "SITE"         -> generateSiteKpis();
            case "SAMPLE"       -> generateSampleKpis();
            case "LAB_RESULT"   -> generateLabResultKpis();
            case "NOTIFICATION" -> generateNotificationKpis();
            default             -> autoGenerateKpiReports();
        };
    }

    // ── Per-scope private generators ─────────────────────────────────────────────

    private List<KpiReportResponseDTO> generatePatientKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<PatientSummaryDTO> patients = patientClient.getAllPatients();
            long total     = patients.size();
            long enrolled  = count(patients, p -> "ENROLLED".equalsIgnoreCase(p.getEnrollmentStatus()));
            long completed = count(patients, p -> "COMPLETED".equalsIgnoreCase(p.getEnrollmentStatus()));
            long withdrawn = count(patients, p -> "WITHDRAWN".equalsIgnoreCase(p.getEnrollmentStatus()));
            long screening = count(patients, p -> "SCREENING".equalsIgnoreCase(p.getEnrollmentStatus()));
            double dropoutRate = total > 0 ? (withdrawn * 100.0 / total) : 0;
            out.add(saveKpi("Patient Enrollment KPI", KpiTrackingType.PATIENT, "Total Patients",    String.valueOf(total),     "patients", today));
            out.add(saveKpi("Patient Enrollment KPI", KpiTrackingType.PATIENT, "Enrolled Patients", String.valueOf(enrolled),  "patients", today));
            out.add(saveKpi("Patient Enrollment KPI", KpiTrackingType.PATIENT, "Screening",         String.valueOf(screening), "patients", today));
            out.add(saveKpi("Patient Enrollment KPI", KpiTrackingType.PATIENT, "Completed",         String.valueOf(completed), "patients", today));
            out.add(saveKpi("Patient Dropout Rate",   KpiTrackingType.PATIENT, "Dropout Rate",      fmt(dropoutRate),          "%",        today));
        } catch (Exception ignored) {}
        return out;
    }

    private List<KpiReportResponseDTO> generateVisitKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<VisitSummaryDTO> visits = patientClient.getAllVisits();
            long total     = visits.size();
            long completed = count(visits, v -> "COMPLETED".equalsIgnoreCase(v.getStatus()));
            long scheduled = count(visits, v -> "SCHEDULED".equalsIgnoreCase(v.getStatus()));
            long missed    = count(visits, v -> "MISSED".equalsIgnoreCase(v.getStatus()));
            double complianceRate = total > 0 ? (completed * 100.0 / total) : 0;
            out.add(saveKpi("Visit Compliance Report", KpiTrackingType.VISIT, "Total Visits",          String.valueOf(total),     "visits", today));
            out.add(saveKpi("Visit Compliance Report", KpiTrackingType.VISIT, "Completed Visits",      String.valueOf(completed), "visits", today));
            out.add(saveKpi("Visit Compliance Report", KpiTrackingType.VISIT, "Scheduled Visits",      String.valueOf(scheduled), "visits", today));
            out.add(saveKpi("Visit Compliance Report", KpiTrackingType.VISIT, "Missed Visits",         String.valueOf(missed),    "visits", today));
            out.add(saveKpi("Visit Compliance Report", KpiTrackingType.VISIT, "Visit Compliance Rate", fmt(complianceRate),       "%",      today));
        } catch (Exception ignored) {}
        return out;
    }

    private List<KpiReportResponseDTO> generateProtocolKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<ProtocolSummaryDTO> protocols = protocolClient.getAllProtocols();
            long total     = protocols.size();
            long active    = count(protocols, p -> "ACTIVE".equalsIgnoreCase(p.getStatus()));
            long completed = count(protocols, p -> "COMPLETED".equalsIgnoreCase(p.getStatus()));
            long pending   = count(protocols, p -> "PENDING".equalsIgnoreCase(p.getStatus()));
            out.add(saveKpi("Protocol Progress Report", KpiTrackingType.PROTOCOL, "Total Protocols",     String.valueOf(total),     "protocols", today));
            out.add(saveKpi("Protocol Progress Report", KpiTrackingType.PROTOCOL, "Active Protocols",    String.valueOf(active),    "protocols", today));
            out.add(saveKpi("Protocol Progress Report", KpiTrackingType.PROTOCOL, "Completed Protocols", String.valueOf(completed), "protocols", today));
            out.add(saveKpi("Protocol Progress Report", KpiTrackingType.PROTOCOL, "Pending Protocols",   String.valueOf(pending),   "protocols", today));
        } catch (Exception ignored) {}
        return out;
    }

    private List<KpiReportResponseDTO> generateSiteKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<SiteSummaryDTO> sites = protocolClient.getAllSites();
            long total    = sites.size();
            long active   = count(sites, s -> "ACTIVE".equalsIgnoreCase(s.getStatus()));
            long inactive = count(sites, s -> "INACTIVE".equalsIgnoreCase(s.getStatus()));
            long pending  = count(sites, s -> "PENDING_APPROVAL".equalsIgnoreCase(s.getStatus()));
            out.add(saveKpi("Site Performance Report", KpiTrackingType.SITE, "Total Sites",            String.valueOf(total),    "sites", today));
            out.add(saveKpi("Site Performance Report", KpiTrackingType.SITE, "Active Sites",           String.valueOf(active),   "sites", today));
            out.add(saveKpi("Site Performance Report", KpiTrackingType.SITE, "Inactive Sites",         String.valueOf(inactive), "sites", today));
            out.add(saveKpi("Site Performance Report", KpiTrackingType.SITE, "Pending Approval Sites", String.valueOf(pending),  "sites", today));
        } catch (Exception ignored) {}
        return out;
    }

    private List<KpiReportResponseDTO> generateSampleKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<SampleSummaryDTO> samples = sampleClient.getAllSamples();
            long total     = samples.size();
            long analyzed  = count(samples, s -> "ANALYZED".equalsIgnoreCase(s.getStatus()));
            long collected = count(samples, s -> "COLLECTED".equalsIgnoreCase(s.getStatus()));
            long inStorage = count(samples, s -> "IN_STORAGE".equalsIgnoreCase(s.getStatus()));
            long disposed  = count(samples, s -> "DISPOSED".equalsIgnoreCase(s.getStatus()));
            double processingRate = total > 0 ? (analyzed * 100.0 / total) : 0;
            out.add(saveKpi("Sample Processing KPI", KpiTrackingType.SAMPLE, "Total Samples",    String.valueOf(total),             "samples", today));
            out.add(saveKpi("Sample Processing KPI", KpiTrackingType.SAMPLE, "Analyzed Samples", String.valueOf(analyzed),          "samples", today));
            out.add(saveKpi("Sample Processing KPI", KpiTrackingType.SAMPLE, "In Storage",       String.valueOf(inStorage),         "samples", today));
            out.add(saveKpi("Sample Processing KPI", KpiTrackingType.SAMPLE, "Pending Samples",  String.valueOf(collected+inStorage),"samples", today));
            out.add(saveKpi("Sample Processing KPI", KpiTrackingType.SAMPLE, "Disposed Samples", String.valueOf(disposed),          "samples", today));
            out.add(saveKpi("Sample Processing KPI", KpiTrackingType.SAMPLE, "Processing Rate",  fmt(processingRate),               "%",       today));
        } catch (Exception ignored) {}
        return out;
    }

    private List<KpiReportResponseDTO> generateLabResultKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<LabResultSummaryDTO> results = sampleClient.getAllLabResults();
            long total    = results.size();
            long pending  = count(results, r -> "PENDING".equalsIgnoreCase(r.getStatus()));
            long completed= count(results, r -> "COMPLETED".equalsIgnoreCase(r.getStatus()));
            long reviewed = count(results, r -> "REVIEWED".equalsIgnoreCase(r.getStatus()));
            long rejected = count(results, r -> "REJECTED".equalsIgnoreCase(r.getStatus()));
            double rejectionRate = total > 0 ? (rejected * 100.0 / total) : 0;
            out.add(saveKpi("Lab Results KPI", KpiTrackingType.LAB_RESULT, "Total Lab Results",  String.valueOf(total),     "results", today));
            out.add(saveKpi("Lab Results KPI", KpiTrackingType.LAB_RESULT, "Pending Results",    String.valueOf(pending),   "results", today));
            out.add(saveKpi("Lab Results KPI", KpiTrackingType.LAB_RESULT, "Completed Results",  String.valueOf(completed), "results", today));
            out.add(saveKpi("Lab Results KPI", KpiTrackingType.LAB_RESULT, "Reviewed Results",   String.valueOf(reviewed),  "results", today));
            out.add(saveKpi("Lab Results KPI", KpiTrackingType.LAB_RESULT, "Rejected Results",   String.valueOf(rejected),  "results", today));
            out.add(saveKpi("Lab Results KPI", KpiTrackingType.LAB_RESULT, "Rejection Rate",     fmt(rejectionRate),        "%",       today));
        } catch (Exception ignored) {}
        return out;
    }

    private List<KpiReportResponseDTO> generateNotificationKpis() {
        List<KpiReportResponseDTO> out = new ArrayList<>();
        try {
            String today = LocalDate.now().toString();
            List<NotificationSummaryDTO> notifications = notificationClient.getAllNotifications();
            long total    = notifications.size();
            long unread   = count(notifications, n -> "UNREAD".equalsIgnoreCase(n.getStatus()));
            long read     = count(notifications, n -> "READ".equalsIgnoreCase(n.getStatus()));
            long archived = count(notifications, n -> "ARCHIVED".equalsIgnoreCase(n.getStatus()));
            double readRate = total > 0 ? (read * 100.0 / total) : 0;
            out.add(saveKpi("Notifications KPI", KpiTrackingType.NOTIFICATION, "Total Notifications",  String.valueOf(total),    "notifications", today));
            out.add(saveKpi("Notifications KPI", KpiTrackingType.NOTIFICATION, "Unread Notifications", String.valueOf(unread),   "notifications", today));
            out.add(saveKpi("Notifications KPI", KpiTrackingType.NOTIFICATION, "Read Notifications",   String.valueOf(read),     "notifications", today));
            out.add(saveKpi("Notifications KPI", KpiTrackingType.NOTIFICATION, "Archived",             String.valueOf(archived), "notifications", today));
            out.add(saveKpi("Notifications KPI", KpiTrackingType.NOTIFICATION, "Read Rate",            fmt(readRate),            "%",             today));
        } catch (Exception ignored) {}
        return out;
    }

    // ── Enhanced Dashboard ───────────────────────────────────────────────────────

    @Override
    public DashboardResponseDTO getDashboard() {
        DashboardResponseDTO dto = new DashboardResponseDTO();
        dto.setTotalKpis(kpiReportRepository.count());
        dto.setTotalReports(kpiReportRepository.count());

        try {
            List<PatientSummaryDTO> patients = patientClient.getAllPatients();
            dto.setTotalPatients(patients.size());
            dto.setEnrolledPatients(count(patients,  p -> "ENROLLED".equalsIgnoreCase(p.getEnrollmentStatus())));
            dto.setCompletedPatients(count(patients, p -> "COMPLETED".equalsIgnoreCase(p.getEnrollmentStatus())));
            dto.setWithdrawnPatients(count(patients, p -> "WITHDRAWN".equalsIgnoreCase(p.getEnrollmentStatus())));
            dto.setScreeningPatients(count(patients, p -> "SCREENING".equalsIgnoreCase(p.getEnrollmentStatus())));
        } catch (Exception ignored) {}

        try {
            List<VisitSummaryDTO> visits = patientClient.getAllVisits();
            dto.setTotalVisits(visits.size());
            dto.setCompletedVisits(count(visits, v -> "COMPLETED".equalsIgnoreCase(v.getStatus())));
            dto.setScheduledVisits(count(visits, v -> "SCHEDULED".equalsIgnoreCase(v.getStatus())));
        } catch (Exception ignored) {}

        try {
            List<ProtocolSummaryDTO> protocols = protocolClient.getAllProtocols();
            dto.setTotalProtocols(protocols.size());
            dto.setActiveProtocols(count(protocols, p -> "ACTIVE".equalsIgnoreCase(p.getStatus())));
        } catch (Exception ignored) {}

        try {
            List<SiteSummaryDTO> sites = protocolClient.getAllSites();
            dto.setTotalSites(sites.size());
            dto.setActiveSites(count(sites, s -> "ACTIVE".equalsIgnoreCase(s.getStatus())));
        } catch (Exception ignored) {}

        try {
            List<SampleSummaryDTO> samples = sampleClient.getAllSamples();
            dto.setTotalSamples(samples.size());
            dto.setAnalyzedSamples(count(samples, s -> "ANALYZED".equalsIgnoreCase(s.getStatus())));
            dto.setPendingSamples(count(samples, s ->
                    "COLLECTED".equalsIgnoreCase(s.getStatus()) || "IN_STORAGE".equalsIgnoreCase(s.getStatus())));
        } catch (Exception ignored) {}

        try {
            List<LabResultSummaryDTO> results = sampleClient.getAllLabResults();
            dto.setTotalLabResults(results.size());
            dto.setCompletedLabResults(count(results, r ->
                    "COMPLETED".equalsIgnoreCase(r.getStatus()) || "REVIEWED".equalsIgnoreCase(r.getStatus())));
            dto.setPendingLabResults(count(results, r -> "PENDING".equalsIgnoreCase(r.getStatus())));
            dto.setRejectedLabResults(count(results, r -> "REJECTED".equalsIgnoreCase(r.getStatus())));
        } catch (Exception ignored) {}

        try {
            List<NotificationSummaryDTO> notifications = notificationClient.getAllNotifications();
            dto.setTotalNotifications(notifications.size());
            dto.setUnreadNotifications(count(notifications, n -> "UNREAD".equalsIgnoreCase(n.getStatus())));
        } catch (Exception ignored) {}

        return dto;
    }

    // ── Study Progress Report ────────────────────────────────────────────────────

    @Override
    public List<StudyProgressDTO> getStudyProgressReport() {
        List<StudyProgressDTO> result = new ArrayList<>();
        try {
            List<ProtocolSummaryDTO>  protocols    = protocolClient.getAllProtocols();
            List<PatientSummaryDTO>   patients     = new ArrayList<>();
            List<VisitSummaryDTO>     visits       = new ArrayList<>();

            try { patients = patientClient.getAllPatients(); } catch (Exception ignored) {}
            try { visits   = patientClient.getAllVisits();   } catch (Exception ignored) {}

            final List<PatientSummaryDTO> allPatients = patients;
            final List<VisitSummaryDTO>   allVisits   = visits;

            for (ProtocolSummaryDTO p : protocols) {
                StudyProgressDTO dto = new StudyProgressDTO();
                dto.setProtocolId(p.getProtocolId());
                dto.setTitle(p.getTitle() != null ? p.getTitle() : "Protocol #" + p.getProtocolId());
                dto.setPhase(p.getPhase());
                dto.setStatus(p.getStatus());
                dto.setStartDate(p.getStartDate());
                dto.setEndDate(p.getEndDate());
                dto.setTargetPatients(p.getTargetPatients());

                // Patients for this protocol
                List<PatientSummaryDTO> myPatients = allPatients.stream()
                        .filter(pt -> p.getProtocolId().equals(pt.getProtocolId()))
                        .collect(Collectors.toList());
                long total    = myPatients.size();
                long enrolled = count(myPatients, pt -> "ENROLLED".equalsIgnoreCase(pt.getEnrollmentStatus()));
                dto.setTotalPatients(total);
                dto.setEnrolledPatients(enrolled);

                // Enrollment %
                if (p.getTargetPatients() != null && p.getTargetPatients() > 0) {
                    dto.setEnrollmentPercentage(Math.min(100.0, enrolled * 100.0 / p.getTargetPatients()));
                } else {
                    dto.setEnrollmentPercentage(0);
                }

                // Sites for this protocol
                dto.setSiteCount(p.getSites() != null ? p.getSites().size() : 0);

                // Visits for this protocol
                List<VisitSummaryDTO> myVisits = allVisits.stream()
                        .filter(v -> p.getProtocolId().equals(v.getProtocolId()))
                        .collect(Collectors.toList());
                dto.setTotalVisits(myVisits.size());
                dto.setCompletedVisits(count(myVisits, v -> "COMPLETED".equalsIgnoreCase(v.getStatus())));
                dto.setScheduledVisits(count(myVisits, v -> "SCHEDULED".equalsIgnoreCase(v.getStatus())));
                dto.setMissedVisits(count(myVisits,    v -> "MISSED".equalsIgnoreCase(v.getStatus())));

                // Progress status
                dto.setProgressStatus(computeProgressStatus(p, dto));

                result.add(dto);
            }
        } catch (Exception ignored) {}
        return result;
    }

    private String computeProgressStatus(ProtocolSummaryDTO protocol, StudyProgressDTO dto) {
        if ("COMPLETED".equalsIgnoreCase(protocol.getStatus()) || "CLOSED".equalsIgnoreCase(protocol.getStatus())) {
            return "Completed";
        }
        // Check if overdue (endDate in the past)
        try {
            if (protocol.getEndDate() != null) {
                java.time.LocalDate end = java.time.LocalDate.parse(protocol.getEndDate());
                if (end.isBefore(java.time.LocalDate.now())) {
                    return "Overdue";
                }
            }
        } catch (Exception ignored) {}

        // Enrollment-based status (only when target is set)
        if (protocol.getTargetPatients() != null && protocol.getTargetPatients() > 0) {
            double pct = dto.getEnrollmentPercentage();
            if (pct >= 90) return "Ahead of Target";
            if (pct >= 60) return "On Track";
            if (pct >= 30) return "In Progress";
            return "Behind Target";
        }
        return "Active";
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private <T> long count(List<T> list, java.util.function.Predicate<T> predicate) {
        return list.stream().filter(predicate).count();
    }

    private String fmt(double value) {
        return String.format("%.1f", value);
    }

    /** Save a single KPI report row and fire an audit event. */
    private KpiReportResponseDTO saveKpi(String reportName, KpiTrackingType scope,
                                         String metricName, String metricValue,
                                         String unit, String dateStr) {
        KpiReport report = new KpiReport();
        report.setReportName(reportName);
        report.setScope(scope);
        report.setMetricName(metricName);
        report.setMetricValue(metricValue);
        report.setUnit(unit);
        report.setGeneratedDate(LocalDate.parse(dateStr));
        report.setMetrics(""); // legacy column
        KpiReport saved = kpiReportRepository.save(report);
        audit("CREATE", saved.getReportId());
        return toResponseDTO(saved);
    }

    private void audit(String action, Long entityId) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String performedBy = auth != null ? auth.getName() : null;

            Long   userId   = null;
            String userName = null;
            String userRole = null;

            if (auth instanceof UsernamePasswordAuthenticationToken) {
                Object details = ((UsernamePasswordAuthenticationToken) auth).getDetails();
                if (details instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = (Map<String, Object>) details;
                    userId   = map.get("userId")   instanceof Long   ? (Long)   map.get("userId")   : null;
                    userName = map.get("userName") instanceof String ? (String) map.get("userName") : null;
                    userRole = map.get("userRole") instanceof String ? (String) map.get("userRole") : null;
                }
            }

            auditClient.logAudit(new AuditEventDTO(
                    userId,
                    performedBy,
                    userName,
                    userRole,
                    action,
                    "KPI_REPORT",
                    LocalDateTime.now().toString(),
                    entityId
            ));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private KpiReportResponseDTO toResponseDTO(KpiReport report) {
        return new KpiReportResponseDTO(
                report.getReportId(),
                report.getReportName(),
                report.getScope() != null ? report.getScope().name() : null,
                report.getMetricName(),
                report.getMetricValue(),
                report.getUnit(),
                report.getGeneratedDate() != null ? report.getGeneratedDate().toString() : null
        );
    }
}
