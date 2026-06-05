package com.biotrack.analyticsservice.service;

import java.util.List;
import com.biotrack.analyticsservice.dto.request.KpiReportRequestDTO;
import com.biotrack.analyticsservice.dto.response.DashboardResponseDTO;
import com.biotrack.analyticsservice.dto.response.KpiReportResponseDTO;
import com.biotrack.analyticsservice.dto.response.StudyProgressDTO;
import com.biotrack.analyticsservice.enums.KpiTrackingType;
import com.biotrack.analyticsservice.exception.IdNotFoundException;

public interface KpiReportService {

    KpiReportResponseDTO addKpiReport(KpiReportRequestDTO dto);

    List<KpiReportResponseDTO> getAllKpiReports();

    KpiReportResponseDTO getKpiReportById(Long id) throws IdNotFoundException;

    KpiReportResponseDTO updateKpiReport(Long id, KpiReportRequestDTO dto) throws IdNotFoundException;

    String deleteKpiReport(Long id) throws IdNotFoundException;

    List<KpiReportResponseDTO> getReportsByScope(KpiTrackingType scope);

    /** Auto-generate KPI reports from live data across all services. */
    List<KpiReportResponseDTO> autoGenerateKpiReports();

    /** Auto-generate KPI reports for a specific scope only (e.g. PATIENT, VISIT). */
    List<KpiReportResponseDTO> autoGenerateKpiReportsByScope(String scope);

    /** Return enriched real-time dashboard stats. */
    DashboardResponseDTO getDashboard();

    /** Return per-protocol Study Progress Report. */
    List<StudyProgressDTO> getStudyProgressReport();
}
