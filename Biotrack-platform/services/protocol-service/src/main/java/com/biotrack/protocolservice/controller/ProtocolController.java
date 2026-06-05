package com.biotrack.protocolservice.controller;

import com.biotrack.protocolservice.dto.request.ProtocolRequestDTO;
import com.biotrack.protocolservice.dto.response.ProtocolResponseDTO;
import com.biotrack.protocolservice.enums.ProtocolPhase;
import com.biotrack.protocolservice.service.ProtocolService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/protocols")
public class ProtocolController {

    private final ProtocolService protocolService;

    public ProtocolController(ProtocolService protocolService) {
        this.protocolService = protocolService;
    }

    // ADMIN + CTM + RESEARCH_SCIENTIST can create protocols (RS submissions are forced to DRAFT on frontend)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<ProtocolResponseDTO> addProtocol(@RequestBody ProtocolRequestDTO dto) {
        return ResponseEntity.ok(protocolService.addProtocol(dto));
    }

    // ADMIN + CTM + RESEARCH_SCIENTIST + DATA_MANAGER can view protocols
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST','DATA_MANAGER')")
    public ResponseEntity<List<ProtocolResponseDTO>> getAllProtocols() {
        return ResponseEntity.ok(protocolService.getAllProtocols());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<ProtocolResponseDTO> getProtocolById(@PathVariable Long id) {
        return ResponseEntity.ok(protocolService.getProtocolById(id));
    }

    // ADMIN + CTM + RESEARCH_SCIENTIST can update (RS can edit details; status changes controlled on frontend)
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<ProtocolResponseDTO> updateProtocol(@PathVariable Long id,
                                                              @RequestBody ProtocolRequestDTO dto) {
        return ResponseEntity.ok(protocolService.updateProtocol(id, dto));
    }

    // Only ADMIN can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteProtocol(@PathVariable Long id) {
        return ResponseEntity.ok(protocolService.deleteProtocol(id));
    }

    @PatchMapping("/{id}/phase")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<ProtocolResponseDTO> updateProtocolPhase(@PathVariable Long id,
                                                                   @RequestParam ProtocolPhase phase) {
        return ResponseEntity.ok(protocolService.updateProtocolPhase(id, phase));
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProtocolResponseDTO> closeProtocol(@PathVariable Long id) {
        return ResponseEntity.ok(protocolService.closeProtocol(id));
    }

    @PostMapping("/{protocolId}/sites/{siteId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<ProtocolResponseDTO> assignSiteToProtocol(@PathVariable Long protocolId,
                                                                    @PathVariable Long siteId) {
        return ResponseEntity.ok(protocolService.assignSiteToProtocol(protocolId, siteId));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProtocolResponseDTO>> getDeletedProtocols() {
        return ResponseEntity.ok(protocolService.getDeletedProtocols());
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProtocolResponseDTO> restoreProtocol(@PathVariable Long id) {
        return ResponseEntity.ok(protocolService.restoreProtocol(id));
    }

    @GetMapping("/site/{siteId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<ProtocolResponseDTO>> getProtocolsBySite(@PathVariable Long siteId) {
        return ResponseEntity.ok(protocolService.getProtocolsBySite(siteId));
    }
}
