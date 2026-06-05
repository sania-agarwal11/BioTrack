package com.biotrack.patientservice.service.implementation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.biotrack.patientservice.client.AuditClient;
import com.biotrack.patientservice.dto.AuditEventDTO;
import com.biotrack.patientservice.dto.request.VisitRequestDTO;
import com.biotrack.patientservice.dto.response.VisitResponseDTO;
import com.biotrack.patientservice.entity.Patient;
import com.biotrack.patientservice.entity.Visit;
import com.biotrack.patientservice.exception.IdNotFoundException;
import com.biotrack.patientservice.repository.PatientRepository;
import com.biotrack.patientservice.repository.VisitRepository;
import com.biotrack.patientservice.service.VisitService;

@Service
public class VisitServiceImpl implements VisitService {

    @Autowired
    private VisitRepository visitRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AuditClient auditClient;

    @Override
    public VisitResponseDTO addVisit(VisitRequestDTO dto) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + dto.getPatientId()));

        Visit visit = new Visit(patient, dto.getProtocolId(), dto.getSiteId(),
                dto.getVisitType(), dto.getVisitDate(), dto.getStatus(), dto.getNotes());
        visit.setCreatedByName(dto.getCreatedByName());
        visit.setCreatedByUserId(dto.getCreatedByUserId());

        Visit savedVisit = visitRepository.save(visit);
        audit("CREATE", savedVisit.getVisitId());
        return toResponseDTO(savedVisit);
    }

    @Override
    public List<VisitResponseDTO> getAllVisits() {
        return visitRepository.findByDeletedFalse().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public VisitResponseDTO getVisitById(Long id) throws IdNotFoundException {
        Visit visit = visitRepository.findByVisitIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Visit not found with ID: " + id));
        return toResponseDTO(visit);
    }

    @Override
    public VisitResponseDTO updateVisit(Long id, VisitRequestDTO dto) throws IdNotFoundException {
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Visit not found with ID: " + id));

        visit.setProtocolId(dto.getProtocolId());
        visit.setSiteId(dto.getSiteId());
        visit.setVisitType(dto.getVisitType());
        visit.setVisitDate(dto.getVisitDate());
        visit.setStatus(dto.getStatus());
        visit.setNotes(dto.getNotes());

        if (dto.getPatientId() != null) {
            Patient patient = patientRepository.findById(dto.getPatientId())
                    .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + dto.getPatientId()));
            visit.setPatient(patient);
        }

        Visit updatedVisit = visitRepository.save(visit);
        audit("UPDATE", updatedVisit.getVisitId());
        return toResponseDTO(updatedVisit);
    }

    @Override
    public String deleteVisit(Long id) throws IdNotFoundException {
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Visit not found with ID: " + id));
        visit.setDeleted(true);
        visitRepository.save(visit);
        audit("DELETE", id);
        return "Visit soft-deleted successfully with ID: " + id;
    }

    @Override
    public List<VisitResponseDTO> getVisitsByPatient(Long patientId) throws IdNotFoundException {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + patientId));
        return visitRepository.findByPatient_PatientIdAndDeletedFalse(patientId).stream()
                .map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public List<VisitResponseDTO> getDeletedVisits() {
        return visitRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public VisitResponseDTO restoreVisit(Long id) {
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Visit not found with ID: " + id));
        visit.setDeleted(false);
        Visit restored = visitRepository.save(visit);
        audit("RESTORE", restored.getVisitId());
        return toResponseDTO(restored);
    }

    private void audit(String action, Long entityId) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();
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
                    action, "VISIT", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private VisitResponseDTO toResponseDTO(Visit visit) {
        return new VisitResponseDTO(
                visit.getVisitId(),
                visit.getPatient() != null ? visit.getPatient().getPatientId() : null,
                visit.getProtocolId(), visit.getSiteId(),
                visit.getVisitType(), visit.getVisitDate(), visit.getStatus(), visit.getNotes(),
                visit.getCreatedByName(), visit.getCreatedByUserId()
        );
    }
}
