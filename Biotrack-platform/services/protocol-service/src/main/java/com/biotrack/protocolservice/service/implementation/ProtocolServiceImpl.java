package com.biotrack.protocolservice.service.implementation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.biotrack.protocolservice.client.AuditClient;
import com.biotrack.protocolservice.dto.AuditEventDTO;
import com.biotrack.protocolservice.dto.request.ProtocolRequestDTO;
import com.biotrack.protocolservice.dto.response.ProtocolResponseDTO;
import com.biotrack.protocolservice.entity.Protocol;
import com.biotrack.protocolservice.entity.Site;
import com.biotrack.protocolservice.enums.ProtocolPhase;
import com.biotrack.protocolservice.exception.IdNotFoundException;
import com.biotrack.protocolservice.repository.ProtocolRepository;
import com.biotrack.protocolservice.repository.SiteRepository;
import com.biotrack.protocolservice.service.ProtocolService;

@Service
@Transactional
public class ProtocolServiceImpl implements ProtocolService {

    private final ProtocolRepository protocolRepository;
    private final SiteRepository siteRepository;
    private final AuditClient auditClient;

    public ProtocolServiceImpl(ProtocolRepository protocolRepository,
                                SiteRepository siteRepository,
                                AuditClient auditClient) {
        this.protocolRepository = protocolRepository;
        this.siteRepository = siteRepository;
        this.auditClient = auditClient;
    }

    @Override
    public ProtocolResponseDTO addProtocol(ProtocolRequestDTO dto) {
        Protocol protocol = new Protocol(dto.getTitle(), dto.getPhase(),
                dto.getStartDate(), dto.getEndDate(), dto.getStatus());
        protocol.setTargetPatients(dto.getTargetPatients());
        protocol.setSubmittedByName(dto.getSubmittedByName());       // null for admin/CTM, set for RS submissions
        protocol.setSubmittedByUserId(dto.getSubmittedByUserId());   // null for admin/CTM, set for RS submissions
        Protocol savedProtocol = protocolRepository.save(protocol);
        audit("CREATE", savedProtocol.getProtocolId());
        return toResponseDTO(savedProtocol);
    }

    @Override
    public List<ProtocolResponseDTO> getAllProtocols() {
        return protocolRepository.findByDeletedFalse().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public ProtocolResponseDTO getProtocolById(Long id) {
        Protocol protocol = protocolRepository.findByProtocolIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + id));
        return toResponseDTO(protocol);
    }

    @Override
    public ProtocolResponseDTO updateProtocol(Long id, ProtocolRequestDTO dto) {
        Protocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + id));

        protocol.setTitle(dto.getTitle());
        protocol.setPhase(dto.getPhase());
        protocol.setStartDate(dto.getStartDate());
        protocol.setEndDate(dto.getEndDate());
        protocol.setStatus(dto.getStatus());
        if (dto.getTargetPatients() != null) {
            protocol.setTargetPatients(dto.getTargetPatients());
        }
        // Preserve submittedByName/UserId; only overwrite if explicitly provided (never cleared by approve/reject)
        if (dto.getSubmittedByName() != null) {
            protocol.setSubmittedByName(dto.getSubmittedByName());
        }
        if (dto.getSubmittedByUserId() != null) {
            protocol.setSubmittedByUserId(dto.getSubmittedByUserId());
        }

        Protocol updatedProtocol = protocolRepository.save(protocol);
        audit("UPDATE", id);
        return toResponseDTO(updatedProtocol);
    }

    @Override
    public String deleteProtocol(Long id) {
        Protocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + id));
        protocol.setDeleted(true);
        protocolRepository.save(protocol);
        audit("DELETE", id);
        return "Protocol soft-deleted successfully";
    }

    @Override
    public ProtocolResponseDTO updateProtocolPhase(Long id, ProtocolPhase phase) {
        Protocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + id));
        protocol.setPhase(phase);
        ProtocolResponseDTO response = toResponseDTO(protocolRepository.save(protocol));
        audit("UPDATE", id);
        return response;
    }

    @Override
    public ProtocolResponseDTO closeProtocol(Long id) {
        Protocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + id));
        protocol.setStatus("CLOSED");
        ProtocolResponseDTO response = toResponseDTO(protocolRepository.save(protocol));
        audit("UPDATE", id);
        return response;
    }

    @Override
    public List<ProtocolResponseDTO> getProtocolsBySite(Long siteId) {
        if (!siteRepository.existsById(siteId)) {
            throw new IdNotFoundException("Site not found with id: " + siteId);
        }
        return protocolRepository.findBySites_SiteIdAndDeletedFalse(siteId)
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public ProtocolResponseDTO assignSiteToProtocol(Long protocolId, Long siteId) {
        Protocol protocol = protocolRepository.findById(protocolId)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + protocolId));
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + siteId));

        // Prevent duplicate assignment (join table has unique constraint)
        boolean alreadyLinked = protocol.getSites().stream()
                .anyMatch(s -> s.getSiteId().equals(siteId));
        if (alreadyLinked) {
            return toResponseDTO(protocol);   // idempotent — return current state
        }

        protocol.getSites().add(site);
        site.getProtocols().add(protocol);

        Protocol updatedProtocol = protocolRepository.save(protocol);
        audit("UPDATE", protocolId);
        return toResponseDTO(updatedProtocol);
    }

    @Override
    public List<ProtocolResponseDTO> getDeletedProtocols() {
        return protocolRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public ProtocolResponseDTO restoreProtocol(Long id) {
        Protocol protocol = protocolRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Protocol not found with id: " + id));
        protocol.setDeleted(false);
        Protocol restored = protocolRepository.save(protocol);
        audit("RESTORE", id);
        return toResponseDTO(restored);
    }

    private void audit(String action, Long entityId) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email    = auth.getName();
            Long   userId   = null;
            String userName = null;
            String userRole = null;

            if (auth instanceof UsernamePasswordAuthenticationToken token
                    && token.getDetails() instanceof java.util.Map<?, ?> details) {
                userId   = (Long)   details.get("userId");
                userName = (String) details.get("userName");
                userRole = (String) details.get("userRole");
            }

            auditClient.logAudit(new AuditEventDTO(
                    userId, email, userName, userRole,
                    action, "PROTOCOL", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private ProtocolResponseDTO toResponseDTO(Protocol protocol) {
        return new ProtocolResponseDTO(
                protocol.getProtocolId(),
                protocol.getTitle(),
                protocol.getPhase(),
                protocol.getStartDate(),
                protocol.getEndDate(),
                protocol.getStatus(),
                protocol.getTargetPatients(),
                protocol.getSubmittedByName(),
                protocol.getSubmittedByUserId(),
                protocol.getSites().stream().map(site -> site.getName()).collect(Collectors.toList())
        );
    }
}
