package com.biotrack.complianceservice.service;

import java.util.List;
import com.biotrack.complianceservice.dto.request.AuditLogRequestDTO;
import com.biotrack.complianceservice.dto.response.AuditLogResponseDTO;
import com.biotrack.complianceservice.exception.IdNotFoundException;

public interface AuditLogService {

    AuditLogResponseDTO addAuditLog(AuditLogRequestDTO dto);

    List<AuditLogResponseDTO> getAllAuditLogs();

    AuditLogResponseDTO getAuditLogById(Long id) throws IdNotFoundException;

    AuditLogResponseDTO updateAuditLog(Long id, AuditLogRequestDTO dto) throws IdNotFoundException;

    String deleteAuditLog(Long id) throws IdNotFoundException;

    List<AuditLogResponseDTO> getAuditLogsByUser(Long userId);

    List<AuditLogResponseDTO> getAuditLogsByAction(String action);

    List<AuditLogResponseDTO> getAuditLogsByEntity(Long entityId);
}
