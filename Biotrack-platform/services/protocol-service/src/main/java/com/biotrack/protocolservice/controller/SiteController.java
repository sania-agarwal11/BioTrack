package com.biotrack.protocolservice.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.protocolservice.dto.request.SiteRequestDTO;
import com.biotrack.protocolservice.dto.response.SiteResponseDTO;
import com.biotrack.protocolservice.enums.SiteStatus;
import com.biotrack.protocolservice.service.SiteService;

@RestController
@RequestMapping("/api/v1/sites")
public class SiteController {

    private final SiteService siteService;

    public SiteController(SiteService siteService) {
        this.siteService = siteService;
    }

    // ADMIN + CTM + RESEARCH_SCIENTIST can create sites (RS submissions land as PENDING_APPROVAL)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<SiteResponseDTO> addSite(@RequestBody SiteRequestDTO dto) {
        return new ResponseEntity<>(siteService.addSite(dto), HttpStatus.CREATED);
    }

    // ADMIN + CTM + RESEARCH_SCIENTIST + DATA_MANAGER can view sites
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST','DATA_MANAGER')")
    public ResponseEntity<List<SiteResponseDTO>> getAllSites() {
        return ResponseEntity.ok(siteService.getAllSites());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<SiteResponseDTO> getSiteById(@PathVariable Long id) {
        return ResponseEntity.ok(siteService.getSiteById(id));
    }

    // ADMIN + CTM + RESEARCH_SCIENTIST can update site details
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<SiteResponseDTO> updateSite(@PathVariable Long id, @RequestBody SiteRequestDTO dto) {
        return ResponseEntity.ok(siteService.updateSite(id, dto));
    }

    // Only ADMIN can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteSite(@PathVariable Long id) {
        return ResponseEntity.ok(siteService.deleteSite(id));
    }

    @GetMapping("/protocol/{protocolId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<SiteResponseDTO>> getSitesByProtocol(@PathVariable Long protocolId) {
        return ResponseEntity.ok(siteService.getSitesByProtocol(protocolId));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<SiteResponseDTO> updateSiteStatus(@PathVariable Long id, @RequestParam SiteStatus status) {
        return ResponseEntity.ok(siteService.updateSiteStatus(id, status));
    }

    @GetMapping("/{id}/investigators")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<String>> getSiteInvestigators(@PathVariable Long id) {
        return ResponseEntity.ok(siteService.getInvestigators(id));
    }

    @GetMapping("/{id}/protocols")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<String>> getSiteProtocols(@PathVariable Long id) {
        return ResponseEntity.ok(siteService.getProtocols(id));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SiteResponseDTO>> getDeletedSites() {
        return ResponseEntity.ok(siteService.getDeletedSites());
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SiteResponseDTO> restoreSite(@PathVariable Long id) {
        return ResponseEntity.ok(siteService.restoreSite(id));
    }
}
