package com.biotrack.analyticsservice.controller;

import java.time.LocalDateTime;
import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.analyticsservice.dto.request.KpiReportRequestDTO;
import com.biotrack.analyticsservice.dto.response.KpiReportResponseDTO;
import com.biotrack.analyticsservice.dto.response.DashboardResponseDTO;
import com.biotrack.analyticsservice.dto.response.StudyProgressDTO;
import com.biotrack.analyticsservice.enums.KpiTrackingType;
import com.biotrack.analyticsservice.service.KpiReportService;

@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "Analytics", description = "Analytics & KPI Reporting APIs")
public class AnalyticsController {

    private final KpiReportService kpiReportService;

    public AnalyticsController(KpiReportService kpiReportService) {
        this.kpiReportService = kpiReportService;
    }

    @Operation(summary = "Get dashboard summary", description = "Returns real-time KPIs and stats from all modules")
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<DashboardResponseDTO> getDashboard() {
        return ResponseEntity.ok(kpiReportService.getDashboard());
    }

    @Operation(summary = "Get study progress report", description = "Returns per-protocol enrollment & visit progress")
    @GetMapping("/study-progress")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<List<StudyProgressDTO>> getStudyProgressReport() {
        return ResponseEntity.ok(kpiReportService.getStudyProgressReport());
    }

    @Operation(summary = "Auto-generate KPI reports", description = "Generates KPI reports from live data across all services")
    @PostMapping("/kpi-reports/auto-generate")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<List<KpiReportResponseDTO>> autoGenerateKpiReports() {
        return new ResponseEntity<>(kpiReportService.autoGenerateKpiReports(), HttpStatus.CREATED);
    }

    @Operation(summary = "Auto-generate KPI reports by scope", description = "Generates KPI reports for a specific scope (PATIENT, VISIT, SAMPLE, etc.)")
    @PostMapping("/kpi-reports/auto-generate/{scope}")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<List<KpiReportResponseDTO>> autoGenerateKpiReportsByScope(@PathVariable String scope) {
        return new ResponseEntity<>(kpiReportService.autoGenerateKpiReportsByScope(scope), HttpStatus.CREATED);
    }

    @Operation(summary = "Add a new KPI report", description = "Creates a KPI report entry manually")
    @PostMapping("/kpi-reports")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<KpiReportResponseDTO> addKpiReport(@RequestBody KpiReportRequestDTO dto) {
        if (dto.getGeneratedDate() == null || dto.getGeneratedDate().isEmpty()) {
            dto.setGeneratedDate(LocalDateTime.now().toLocalDate().toString());
        }
        return new ResponseEntity<>(kpiReportService.addKpiReport(dto), HttpStatus.CREATED);
    }

    // Only ADMIN + DATA_MANAGER can view KPI reports
    @Operation(summary = "Get all KPI reports", description = "Fetches all KPI reports")
    @GetMapping("/kpi-reports")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<List<KpiReportResponseDTO>> getAllKpiReports() {
        return new ResponseEntity<>(kpiReportService.getAllKpiReports(), HttpStatus.OK);
    }

    @Operation(summary = "Get KPI report by ID", description = "Fetches a KPI report by its ID")
    @GetMapping("/kpi-reports/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<KpiReportResponseDTO> getKpiReportById(@PathVariable Long id) {
        return new ResponseEntity<>(kpiReportService.getKpiReportById(id), HttpStatus.OK);
    }

    // Only ADMIN + DATA_MANAGER can update KPI reports
    @Operation(summary = "Update KPI report", description = "Updates an existing KPI report by ID")
    @PutMapping("/kpi-reports/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<KpiReportResponseDTO> updateKpiReport(@PathVariable Long id,
                                                                @RequestBody KpiReportRequestDTO dto) {
        return new ResponseEntity<>(kpiReportService.updateKpiReport(id, dto), HttpStatus.OK);
    }

    // Only ADMIN can delete
    @Operation(summary = "Delete KPI report", description = "Deletes a KPI report by ID")
    @DeleteMapping("/kpi-reports/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteKpiReport(@PathVariable Long id) {
        return new ResponseEntity<>(kpiReportService.deleteKpiReport(id), HttpStatus.OK);
    }

    @Operation(summary = "Get KPI reports by scope", description = "Fetches KPI reports filtered by scope")
    @GetMapping("/kpi-reports/scope/{scope}")
    @PreAuthorize("hasAnyRole('ADMIN','DATA_MANAGER')")
    public ResponseEntity<List<KpiReportResponseDTO>> getReportsByScope(@PathVariable KpiTrackingType scope) {
        return new ResponseEntity<>(kpiReportService.getReportsByScope(scope), HttpStatus.OK);
    }
}
