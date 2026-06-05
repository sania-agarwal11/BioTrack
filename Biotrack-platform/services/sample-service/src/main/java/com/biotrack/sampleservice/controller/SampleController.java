package com.biotrack.sampleservice.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.sampleservice.dto.request.LabResultRequestDTO;
import com.biotrack.sampleservice.dto.request.SampleRequestDTO;
import com.biotrack.sampleservice.dto.response.LabResultResponseDTO;
import com.biotrack.sampleservice.dto.response.SampleResponseDTO;
import com.biotrack.sampleservice.dto.response.SampleStatusHistoryResponseDTO;
import com.biotrack.sampleservice.enums.SampleStatus;
import com.biotrack.sampleservice.service.LabResultService;
import com.biotrack.sampleservice.service.SampleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/samples")
@Tag(name = "Samples", description = "Endpoints for managing samples")
public class SampleController {

    @Autowired
    private SampleService sampleService;

    @Autowired
    private LabResultService labResultService;

    // Only ADMIN + LAB_TECHNICIAN can create samples
    @Operation(summary = "Add a new sample", description = "Creates a new sample record")
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<SampleResponseDTO> addSample(@RequestBody SampleRequestDTO dto) {
        return new ResponseEntity<>(sampleService.addSample(dto), HttpStatus.CREATED);
    }

    // ADMIN + LAB_TECHNICIAN + DATA_MANAGER can view samples (DATA_MANAGER needs read access for analytics)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN','DATA_MANAGER')")
    public ResponseEntity<List<SampleResponseDTO>> getAllSamples() {
        return ResponseEntity.ok(sampleService.getAllSamples());
    }

    @GetMapping("/protocol/{protocolId}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<List<SampleResponseDTO>> getSamplesByProtocol(@PathVariable Long protocolId) {
        return ResponseEntity.ok(sampleService.getSamplesByProtocol(protocolId));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<SampleResponseDTO>> getSamplesByPatient(@PathVariable Long patientId) {
        return ResponseEntity.ok(sampleService.getSamplesByPatient(patientId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<SampleResponseDTO> getSampleById(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.getSampleById(id));
    }

    // Only ADMIN + LAB_TECHNICIAN can update samples
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<SampleResponseDTO> updateSample(@PathVariable Long id, @RequestBody SampleRequestDTO dto) {
        return ResponseEntity.ok(sampleService.updateSample(id, dto));
    }

    // ADMIN + LAB_TECHNICIAN can delete
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<String> deleteSample(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.deleteSample(id));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<SampleResponseDTO> updateSampleStatus(@PathVariable Long id,
                                                                @RequestParam SampleStatus status) {
        return ResponseEntity.ok(sampleService.updateSampleStatus(id, status));
    }

    @PostMapping("/{id}/results/upload")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<LabResultResponseDTO> uploadLabResults(@PathVariable Long id,
                                                                 @RequestBody LabResultRequestDTO dto) {
        dto.setSampleId(id);
        return new ResponseEntity<>(labResultService.addLabResult(dto), HttpStatus.CREATED);
    }

    @GetMapping("/{id}/results")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<LabResultResponseDTO> getLabResults(@PathVariable Long id) {
        return ResponseEntity.ok(labResultService.getLabResultBySampleId(id));
    }

    @GetMapping("/{id}/status-history")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<SampleStatusHistoryResponseDTO>> getStatusHistory(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.getStatusHistory(id));
    }

    @PutMapping("/{id}/dispose")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<SampleResponseDTO> disposeSample(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.disposeSample(id));
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<List<SampleResponseDTO>> getDeletedSamples() {
        return ResponseEntity.ok(sampleService.getDeletedSamples());
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','LAB_TECHNICIAN')")
    public ResponseEntity<SampleResponseDTO> restoreSample(@PathVariable Long id) {
        return ResponseEntity.ok(sampleService.restoreSample(id));
    }
}
