package com.biotrack.sampleservice.controller;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.sampleservice.dto.request.LabResultRequestDTO;
import com.biotrack.sampleservice.dto.response.LabResultResponseDTO;
import com.biotrack.sampleservice.service.LabResultService;

@RestController
@RequestMapping("/api/v1/lab-results")
@Tag(name = "Lab Results", description = "Endpoints for managing lab results")
public class LabResultController {

    @Autowired
    private LabResultService labResultService;

    // Only ADMIN + LAB_TECHNICIAN can create lab results
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<LabResultResponseDTO> addLabResult(@RequestBody LabResultRequestDTO dto) {
        return new ResponseEntity<>(labResultService.addLabResult(dto), HttpStatus.CREATED);
    }

    // ADMIN + LAB_TECHNICIAN + DATA_MANAGER can view lab results (DATA_MANAGER needs read access for analytics)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN','DATA_MANAGER')")
    public ResponseEntity<List<LabResultResponseDTO>> getAllLabResults() {
        return ResponseEntity.ok(labResultService.getAllLabResults());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<LabResultResponseDTO> getLabResultById(@PathVariable Long id) {
        return ResponseEntity.ok(labResultService.getLabResultById(id));
    }

    // Only ADMIN + LAB_TECHNICIAN can update lab results
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<LabResultResponseDTO> updateLabResult(@PathVariable Long id,
                                                                @RequestBody LabResultRequestDTO dto) {
        return ResponseEntity.ok(labResultService.updateLabResult(id, dto));
    }

    // ADMIN + LAB_TECHNICIAN can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<String> deleteLabResult(@PathVariable Long id) {
        return ResponseEntity.ok(labResultService.deleteLabResult(id));
    }

    @Operation(summary = "Get lab result by sample ID", description = "Fetches lab result linked to a specific sample")
    @GetMapping("/sample/{sampleId}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<LabResultResponseDTO> getLabResultBySampleId(@PathVariable Long sampleId) {
        return ResponseEntity.ok(labResultService.getLabResultBySampleId(sampleId));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<List<LabResultResponseDTO>> getDeletedLabResults() {
        return ResponseEntity.ok(labResultService.getDeletedLabResults());
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<LabResultResponseDTO> restoreLabResult(@PathVariable Long id) {
        return ResponseEntity.ok(labResultService.restoreLabResult(id));
    }
}
