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
import com.biotrack.protocolservice.dto.request.SiteRequestDTO;
import com.biotrack.protocolservice.dto.response.SiteResponseDTO;
import com.biotrack.protocolservice.entity.Site;
import com.biotrack.protocolservice.entity.Protocol;
import com.biotrack.protocolservice.enums.SiteStatus;
import com.biotrack.protocolservice.exception.IdNotFoundException;
import com.biotrack.protocolservice.repository.SiteRepository;
import com.biotrack.protocolservice.repository.ProtocolRepository;
import com.biotrack.protocolservice.service.SiteService;

@Service
@Transactional
public class SiteServiceImpl implements SiteService {

    private final SiteRepository siteRepository;
    private final ProtocolRepository protocolRepository;
    private final AuditClient auditClient;

    public SiteServiceImpl(SiteRepository siteRepository,
                            ProtocolRepository protocolRepository,
                            AuditClient auditClient) {
        this.siteRepository = siteRepository;
        this.protocolRepository = protocolRepository;
        this.auditClient = auditClient;
    }

    @Override
    public SiteResponseDTO addSite(SiteRequestDTO dto) {
        Site site = new Site();
        site.setName(dto.getName());
        site.setLocation(dto.getLocation());
        site.setInvestigatorId(dto.getInvestigatorId());
        site.setStatus(dto.getStatus());
        site.setSubmittedByName(dto.getSubmittedByName());       // null for admin/CTM
        site.setSubmittedByUserId(dto.getSubmittedByUserId());   // null for admin/CTM

        Site savedSite = siteRepository.save(site);
        audit("CREATE", savedSite.getSiteId());
        return toResponseDTO(savedSite);
    }

    @Override
    public List<SiteResponseDTO> getAllSites() {
        return siteRepository.findByDeletedFalse().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public SiteResponseDTO getSiteById(Long id) {
        Site site = siteRepository.findBySiteIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + id));
        return toResponseDTO(site);
    }

    @Override
    public SiteResponseDTO updateSite(Long id, SiteRequestDTO dto) {
        Site site = siteRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + id));

        site.setName(dto.getName());
        site.setLocation(dto.getLocation());
        site.setInvestigatorId(dto.getInvestigatorId());
        site.setStatus(dto.getStatus());
        // Preserve submittedByName/UserId; only overwrite if explicitly provided
        if (dto.getSubmittedByName() != null) {
            site.setSubmittedByName(dto.getSubmittedByName());
        }
        if (dto.getSubmittedByUserId() != null) {
            site.setSubmittedByUserId(dto.getSubmittedByUserId());
        }

        Site updatedSite = siteRepository.save(site);
        audit("UPDATE", updatedSite.getSiteId());
        return toResponseDTO(updatedSite);
    }

    @Override
    public String deleteSite(Long id) {
        Site site = siteRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + id));
        site.setDeleted(true);
        siteRepository.save(site);
        audit("DELETE", id);
        return "Site soft-deleted successfully";
    }

    @Override
    public List<SiteResponseDTO> getSitesByProtocol(Long protocolId) {
        // Validate protocol exists first
        if (!protocolRepository.existsById(protocolId)) {
            throw new IdNotFoundException("Protocol not found with id: " + protocolId);
        }
        // Use direct repository query to avoid lazy loading issues on the Many-to-Many join table
        return siteRepository.findByProtocols_ProtocolId(protocolId)
                .stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public SiteResponseDTO updateSiteStatus(Long id, SiteStatus status) {
        Site site = siteRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + id));
        site.setStatus(status);
        Site updatedSite = siteRepository.save(site);
        audit("UPDATE", updatedSite.getSiteId());
        return toResponseDTO(updatedSite);
    }

    @Override
    public List<String> getInvestigators(Long siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + siteId));
        return List.of(site.getInvestigatorId());
    }

    @Override
    public List<String> getProtocols(Long siteId) {
        Site site = siteRepository.findById(siteId)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + siteId));
        return site.getProtocols().stream().map(Protocol::getTitle).collect(Collectors.toList());
    }

    @Override
    public List<SiteResponseDTO> getDeletedSites() {
        return siteRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public SiteResponseDTO restoreSite(Long id) {
        Site site = siteRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Site not found with id: " + id));
        site.setDeleted(false);
        Site restored = siteRepository.save(site);
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
                    action, "SITE", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private SiteResponseDTO toResponseDTO(Site site) {
        return new SiteResponseDTO(
                site.getSiteId(), site.getName(), site.getLocation(),
                site.getInvestigatorId(), site.getStatus(),
                site.getSubmittedByName(),
                site.getSubmittedByUserId(),
                site.getProtocols().stream().map(Protocol::getTitle).collect(Collectors.toList())
        );
    }
}
