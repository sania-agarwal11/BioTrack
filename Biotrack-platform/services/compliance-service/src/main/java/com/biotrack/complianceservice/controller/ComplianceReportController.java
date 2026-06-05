package com.biotrack.complianceservice.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.complianceservice.dto.request.ComplianceReportRequestDTO;
import com.biotrack.complianceservice.dto.response.ComplianceReportResponseDTO;
import com.biotrack.complianceservice.service.ComplianceReportService;

@RestController
@RequestMapping("/api/v1/compliance-reports")
public class ComplianceReportController {

    private final ComplianceReportService complianceReportService;

    public ComplianceReportController(ComplianceReportService complianceReportService) {
        this.complianceReportService = complianceReportService;
    }

    // Only ADMIN + REGULATORY_OFFICER can create compliance reports
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<ComplianceReportResponseDTO> addComplianceReport(@RequestBody ComplianceReportRequestDTO dto) {
        return new ResponseEntity<>(complianceReportService.addComplianceReport(dto), HttpStatus.CREATED);
    }

    // Only ADMIN + REGULATORY_OFFICER can view compliance reports
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<List<ComplianceReportResponseDTO>> getAllComplianceReports() {
        return ResponseEntity.ok(complianceReportService.getAllComplianceReports());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<ComplianceReportResponseDTO> getComplianceReportById(@PathVariable Long id) {
        return ResponseEntity.ok(complianceReportService.getComplianceReportById(id));
    }

    // Only ADMIN + REGULATORY_OFFICER can update compliance reports
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<ComplianceReportResponseDTO> updateComplianceReport(@PathVariable Long id,
                                                                              @RequestBody ComplianceReportRequestDTO dto) {
        return ResponseEntity.ok(complianceReportService.updateComplianceReport(id, dto));
    }

    // Only ADMIN can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteComplianceReport(@PathVariable Long id) {
        return ResponseEntity.ok(complianceReportService.deleteComplianceReport(id));
    }

    // Only ADMIN + REGULATORY_OFFICER can generate reports
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<ComplianceReportResponseDTO> generateComplianceReport() {
        ComplianceReportRequestDTO dto = new ComplianceReportRequestDTO(
                "GLOBAL",
                "AUTO",
                java.time.LocalDate.now().toString()
        );
        // scope="GLOBAL", generatedBy="AUTO", generatedDate=today
        return new ResponseEntity<>(complianceReportService.addComplianceReport(dto), HttpStatus.CREATED);
    }
}
