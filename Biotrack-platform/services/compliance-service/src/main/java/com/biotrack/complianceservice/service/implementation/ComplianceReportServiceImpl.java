package com.biotrack.complianceservice.service.implementation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.biotrack.complianceservice.dto.request.AuditLogRequestDTO;
import com.biotrack.complianceservice.dto.request.ComplianceReportRequestDTO;
import com.biotrack.complianceservice.dto.response.ComplianceReportResponseDTO;
import com.biotrack.complianceservice.entity.ComplianceReport;
import com.biotrack.complianceservice.enums.ActionType;
import com.biotrack.complianceservice.exception.IdNotFoundException;
import com.biotrack.complianceservice.repository.ComplianceReportRepository;
import com.biotrack.complianceservice.service.AuditLogService;
import com.biotrack.complianceservice.service.ComplianceReportService;

@Service
public class ComplianceReportServiceImpl implements ComplianceReportService {

    @Autowired
    private ComplianceReportRepository complianceReportRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Override
    public ComplianceReportResponseDTO addComplianceReport(ComplianceReportRequestDTO dto) {
        String dateStr = (dto.getGeneratedDate() != null && !dto.getGeneratedDate().isEmpty())
                ? dto.getGeneratedDate()
                : LocalDate.now().toString();

        ComplianceReport report = new ComplianceReport(
                dto.getScope(),
                dto.getGeneratedBy(),
                LocalDate.parse(dateStr)
        );
        ComplianceReport saved = complianceReportRepository.save(report);
        audit(ActionType.CREATE, saved.getReportId());
        return toResponseDTO(saved);
    }

    @Override
    public List<ComplianceReportResponseDTO> getAllComplianceReports() {
        return complianceReportRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ComplianceReportResponseDTO getComplianceReportById(Long id) throws IdNotFoundException {
        ComplianceReport report = complianceReportRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("ComplianceReport not found with ID: " + id));
        return toResponseDTO(report);
    }

    @Override
    public ComplianceReportResponseDTO updateComplianceReport(Long id, ComplianceReportRequestDTO dto)
            throws IdNotFoundException {
        ComplianceReport report = complianceReportRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("ComplianceReport not found with ID: " + id));

        report.setScope(dto.getScope());
        report.setGeneratedBy(dto.getGeneratedBy());
        if (dto.getGeneratedDate() != null && !dto.getGeneratedDate().isEmpty()) {
            report.setGeneratedDate(LocalDate.parse(dto.getGeneratedDate()));
        }

        ComplianceReport updated = complianceReportRepository.save(report);
        audit(ActionType.UPDATE, updated.getReportId());
        return toResponseDTO(updated);
    }

    @Override
    public String deleteComplianceReport(Long id) throws IdNotFoundException {
        ComplianceReport report = complianceReportRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("ComplianceReport not found with ID: " + id));
        complianceReportRepository.delete(report);
        audit(ActionType.DELETE, id);
        return "ComplianceReport deleted successfully with ID: " + id;
    }

    private void audit(ActionType action, Long entityId) {
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

            auditLogService.addAuditLog(new AuditLogRequestDTO(
                    userId,
                    performedBy,
                    userName,
                    userRole,
                    action,
                    "COMPLIANCE_REPORT",
                    LocalDateTime.now().toString(),
                    entityId
            ));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private ComplianceReportResponseDTO toResponseDTO(ComplianceReport report) {
        return new ComplianceReportResponseDTO(
                report.getReportId(),
                report.getScope(),
                report.getGeneratedBy(),
                report.getGeneratedDate() != null ? report.getGeneratedDate().toString() : null
        );
    }
}
