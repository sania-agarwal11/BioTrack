package com.biotrack.patientservice.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.biotrack.patientservice.dto.request.PatientRequestDTO;
import com.biotrack.patientservice.dto.response.PatientDocumentResponseDTO;
import com.biotrack.patientservice.dto.response.PatientResponseDTO;
import com.biotrack.patientservice.dto.response.VisitResponseDTO;
import com.biotrack.patientservice.entity.PatientDocument;
import com.biotrack.patientservice.enums.EnrollmentStatus;
import com.biotrack.patientservice.repository.PatientDocumentRepository;
import com.biotrack.patientservice.service.PatientService;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientController {

    @Autowired
    private PatientService patientService;

    @Autowired
    private PatientDocumentRepository patientDocumentRepository;

    // Only ADMIN + CTM can enroll patients
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<PatientResponseDTO> addPatient(@RequestBody PatientRequestDTO dto) {
        return ResponseEntity.status(201).body(patientService.addPatient(dto));
    }

    // ADMIN + CTM + DATA_MANAGER can view patients (DATA_MANAGER needs read access for analytics)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST','DATA_MANAGER')")
    public ResponseEntity<List<PatientResponseDTO>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients());
    }

    @GetMapping("/site/{siteId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<PatientResponseDTO>> getPatientsBySite(@PathVariable Long siteId) {
        return ResponseEntity.ok(patientService.getPatientsBySite(siteId));
    }

    @GetMapping("/protocol/{protocolId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<PatientResponseDTO>> getPatientsByProtocol(@PathVariable Long protocolId) {
        return ResponseEntity.ok(patientService.getPatientsByProtocol(protocolId));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<PatientResponseDTO>> getPatientsByStatus(@PathVariable EnrollmentStatus status) {
        return ResponseEntity.ok(patientService.getPatientsByStatus(status));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<PatientResponseDTO> getPatientById(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    // Only ADMIN + CTM can update patients
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<PatientResponseDTO> updatePatient(@PathVariable Long id, @RequestBody PatientRequestDTO dto) {
        return ResponseEntity.ok(patientService.updatePatient(id, dto));
    }

    // ADMIN + CTM can delete (soft)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<String> deletePatient(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.deletePatient(id));
    }

    // ADMIN + CTM can view deleted patients
    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<List<PatientResponseDTO>> getDeletedPatients() {
        return ResponseEntity.ok(patientService.getDeletedPatients());
    }

    // ADMIN + CTM can restore a deleted patient
    @PutMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<PatientResponseDTO> restorePatient(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.restorePatient(id));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','RESEARCH_SCIENTIST')")
    public ResponseEntity<List<VisitResponseDTO>> getPatientHistory(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientHistory(id));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<PatientResponseDTO> updateEnrollmentStatus(@PathVariable Long id,
                                                                     @RequestParam EnrollmentStatus status) {
        return ResponseEntity.ok(patientService.updateEnrollmentStatus(id, status));
    }

    // Only ADMIN + CTM can upload patient documents
    @PostMapping("/{id}/documents/upload")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<PatientDocumentResponseDTO> uploadPatientDocument(@PathVariable Long id,
                                                                            @RequestParam("file") MultipartFile file) {
        try {
            PatientDocument document = new PatientDocument(
                    id,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getBytes(),
                    LocalDateTime.now().toString()
            );
            PatientDocument saved = patientDocumentRepository.save(document);
            PatientDocumentResponseDTO response = new PatientDocumentResponseDTO(
                    saved.getDocumentId(),
                    saved.getFileName(),
                    saved.getContentType(),
                    saved.getUploadedAt()
            );
            return ResponseEntity.status(201).body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{id}/documents")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<List<PatientDocumentResponseDTO>> listPatientDocuments(@PathVariable Long id) {
        List<PatientDocumentResponseDTO> response = patientDocumentRepository.findByPatientId(id).stream()
                .map(document -> new PatientDocumentResponseDTO(
                        document.getDocumentId(),
                        document.getFileName(),
                        document.getContentType(),
                        document.getUploadedAt()
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/documents/{docId}/download")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER')")
    public ResponseEntity<byte[]> downloadPatientDocument(@PathVariable Long id, @PathVariable Long docId) {
        return patientDocumentRepository.findById(docId)
                .filter(document -> document.getPatientId().equals(id))
                .map(document -> ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"" + document.getFileName() + "\"")
                        .contentType(MediaType.parseMediaType(document.getContentType()))
                        .body(document.getData()))
                .orElse(ResponseEntity.notFound().build());
    }
}
