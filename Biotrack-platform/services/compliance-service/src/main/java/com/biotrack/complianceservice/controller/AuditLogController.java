package com.biotrack.complianceservice.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.complianceservice.dto.request.AuditLogRequestDTO;
import com.biotrack.complianceservice.dto.response.AuditLogResponseDTO;
import com.biotrack.complianceservice.service.AuditLogService;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    // Any authenticated service can post audit logs (used by Feign clients internally)
    // All roles can POST audit logs — Feign clients from sample/patient/protocol etc. use the caller's JWT
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AuditLogResponseDTO> addAuditLog(@RequestBody AuditLogRequestDTO dto) {
        return new ResponseEntity<>(auditLogService.addAuditLog(dto), HttpStatus.CREATED);
    }

    // Only ADMIN + REGULATORY_OFFICER can view all audit logs
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<List<AuditLogResponseDTO>> getAllAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAllAuditLogs());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<AuditLogResponseDTO> getAuditLogById(@PathVariable Long id) {
        return ResponseEntity.ok(auditLogService.getAuditLogById(id));
    }

    // Only ADMIN can update audit logs
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuditLogResponseDTO> updateAuditLog(@PathVariable Long id,
                                                              @RequestBody AuditLogRequestDTO dto) {
        return ResponseEntity.ok(auditLogService.updateAuditLog(id, dto));
    }

    // Only ADMIN can delete audit logs
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteAuditLog(@PathVariable Long id) {
        return ResponseEntity.ok(auditLogService.deleteAuditLog(id));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByUser(userId));
    }

    @GetMapping("/action/{action}")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByAction(@PathVariable String action) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByAction(action));
    }

    @GetMapping("/entity/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN','REGULATORY_OFFICER')")
    public ResponseEntity<List<AuditLogResponseDTO>> getAuditLogsByEntity(@PathVariable Long entityId) {
        return ResponseEntity.ok(auditLogService.getAuditLogsByEntity(entityId));
    }
}
