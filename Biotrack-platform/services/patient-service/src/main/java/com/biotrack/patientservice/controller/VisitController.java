package com.biotrack.patientservice.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.patientservice.dto.request.VisitRequestDTO;
import com.biotrack.patientservice.dto.response.VisitResponseDTO;
import com.biotrack.patientservice.service.VisitService;

@RestController
@RequestMapping("/api/v1/visits")
public class VisitController {

    @Autowired
    private VisitService visitService;

    // Only ADMIN + CTM can create visits (LAB_TECHNICIAN removed — not in patient service)
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<VisitResponseDTO> addVisit(@RequestBody VisitRequestDTO dto) {
        return ResponseEntity.status(201).body(visitService.addVisit(dto));
    }

    // ADMIN + CTM + DATA_MANAGER can view visits (DATA_MANAGER needs read access for analytics)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST','DATA_MANAGER')")
    public ResponseEntity<List<VisitResponseDTO>> getAllVisits() {
        return ResponseEntity.ok(visitService.getAllVisits());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<VisitResponseDTO> getVisitById(@PathVariable Long id) {
        return ResponseEntity.ok(visitService.getVisitById(id));
    }

    // Only ADMIN + CTM can update visits
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<VisitResponseDTO> updateVisit(@PathVariable Long id, @RequestBody VisitRequestDTO dto) {
        return ResponseEntity.ok(visitService.updateVisit(id, dto));
    }

    // ADMIN + CTM can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<String> deleteVisit(@PathVariable Long id) {
        return ResponseEntity.ok(visitService.deleteVisit(id));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<VisitResponseDTO>> getVisitsByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(visitService.getVisitsByPatient(patientId));
    }

    // ADMIN + CTM can view deleted visits
    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<List<VisitResponseDTO>> getDeletedVisits() {
        return ResponseEntity.ok(visitService.getDeletedVisits());
    }

    // ADMIN + CTM can restore deleted visits
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<VisitResponseDTO> restoreVisit(@PathVariable Long id) {
        return ResponseEntity.ok(visitService.restoreVisit(id));
    }
}
