package com.biotrack.complianceservice.service.implementation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.biotrack.complianceservice.dto.request.AuditLogRequestDTO;
import com.biotrack.complianceservice.dto.response.AuditLogResponseDTO;
import com.biotrack.complianceservice.entity.AuditLog;
import com.biotrack.complianceservice.enums.ActionType;
import com.biotrack.complianceservice.exception.IdNotFoundException;
import com.biotrack.complianceservice.repository.AuditLogRepository;
import com.biotrack.complianceservice.service.AuditLogService;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Override
    public AuditLogResponseDTO addAuditLog(AuditLogRequestDTO dto) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(dto.getUserId());
        auditLog.setPerformedBy(dto.getPerformedBy());
        auditLog.setUserName(dto.getUserName());
        auditLog.setUserRole(dto.getUserRole());
        auditLog.setAction(dto.getAction());
        auditLog.setResourceType(dto.getResourceType());
        auditLog.setTimestamp(dto.getTimestamp() != null
                ? LocalDateTime.parse(dto.getTimestamp())
                : LocalDateTime.now());
        auditLog.setEntityId(dto.getEntityId());
        return toResponseDTO(auditLogRepository.save(auditLog));
    }

    @Override
    public List<AuditLogResponseDTO> getAllAuditLogs() {
        return auditLogRepository.findAll()
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public AuditLogResponseDTO getAuditLogById(Long id) throws IdNotFoundException {
        AuditLog auditLog = auditLogRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("AuditLog not found with ID: " + id));
        return toResponseDTO(auditLog);
    }

    @Override
    public AuditLogResponseDTO updateAuditLog(Long id, AuditLogRequestDTO dto) throws IdNotFoundException {
        AuditLog auditLog = auditLogRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("AuditLog not found with ID: " + id));

        auditLog.setUserId(dto.getUserId());
        auditLog.setPerformedBy(dto.getPerformedBy());
        auditLog.setUserName(dto.getUserName());
        auditLog.setUserRole(dto.getUserRole());
        auditLog.setAction(dto.getAction());
        auditLog.setResourceType(dto.getResourceType());
        auditLog.setTimestamp(dto.getTimestamp() != null
                ? LocalDateTime.parse(dto.getTimestamp())
                : LocalDateTime.now());
        auditLog.setEntityId(dto.getEntityId());

        return toResponseDTO(auditLogRepository.save(auditLog));
    }

    @Override
    public String deleteAuditLog(Long id) throws IdNotFoundException {
        AuditLog auditLog = auditLogRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("AuditLog not found with ID: " + id));
        auditLogRepository.delete(auditLog);
        return "AuditLog deleted successfully with ID: " + id;
    }

    @Override
    public List<AuditLogResponseDTO> getAuditLogsByUser(Long userId) {
        return auditLogRepository.findByUserId(userId)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<AuditLogResponseDTO> getAuditLogsByAction(String action) {
        ActionType actionType = ActionType.valueOf(action.toUpperCase());
        return auditLogRepository.findByAction(actionType)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<AuditLogResponseDTO> getAuditLogsByEntity(Long entityId) {
        return auditLogRepository.findByEntityId(entityId)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    private AuditLogResponseDTO toResponseDTO(AuditLog auditLog) {
        return new AuditLogResponseDTO(
                auditLog.getAuditId(),
                auditLog.getUserId(),
                auditLog.getPerformedBy(),
                auditLog.getUserName(),
                auditLog.getUserRole(),
                auditLog.getAction(),
                auditLog.getResourceType(),
                auditLog.getTimestamp().toString(),
                auditLog.getEntityId()
        );
    }
}
