package com.biotrack.protocolservice.service;

import java.util.List;
import com.biotrack.protocolservice.dto.request.SiteRequestDTO;
import com.biotrack.protocolservice.dto.response.SiteResponseDTO;
import com.biotrack.protocolservice.enums.SiteStatus;

public interface SiteService {

    // Create a new site
    SiteResponseDTO addSite(SiteRequestDTO dto);

    // Get all sites
    List<SiteResponseDTO> getAllSites();

    // Get site by ID
    SiteResponseDTO getSiteById(Long id);

    // Update site details
    SiteResponseDTO updateSite(Long id, SiteRequestDTO dto);

    // Delete site
    String deleteSite(Long id);

    // Get all sites linked to a protocol
    List<SiteResponseDTO> getSitesByProtocol(Long protocolId);

    // Update site status
    SiteResponseDTO updateSiteStatus(Long id, SiteStatus status);

    // Get investigators at a site
    List<String> getInvestigators(Long siteId);

    // Get protocols running at a site
    List<String> getProtocols(Long siteId);

    List<SiteResponseDTO> getDeletedSites();

    SiteResponseDTO restoreSite(Long id);
}
