package com.biotrack.complianceservice.service;

import java.util.List;
import com.biotrack.complianceservice.dto.request.ComplianceReportRequestDTO;
import com.biotrack.complianceservice.dto.response.ComplianceReportResponseDTO;
import com.biotrack.complianceservice.exception.IdNotFoundException;

public interface ComplianceReportService {

    ComplianceReportResponseDTO addComplianceReport(ComplianceReportRequestDTO dto);

    List<ComplianceReportResponseDTO> getAllComplianceReports();

    ComplianceReportResponseDTO getComplianceReportById(Long id) throws IdNotFoundException;

    ComplianceReportResponseDTO updateComplianceReport(Long id, ComplianceReportRequestDTO dto) throws IdNotFoundException;

    String deleteComplianceReport(Long id) throws IdNotFoundException;
}
