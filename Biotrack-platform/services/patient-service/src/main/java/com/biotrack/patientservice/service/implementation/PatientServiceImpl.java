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
import com.biotrack.patientservice.dto.request.PatientRequestDTO;
import com.biotrack.patientservice.dto.response.PatientResponseDTO;
import com.biotrack.patientservice.dto.response.VisitResponseDTO;
import com.biotrack.patientservice.entity.Patient;
import com.biotrack.patientservice.entity.Visit;
import com.biotrack.patientservice.enums.EnrollmentStatus;
import com.biotrack.patientservice.exception.IdNotFoundException;
import com.biotrack.patientservice.repository.PatientRepository;
import com.biotrack.patientservice.repository.VisitRepository;
import com.biotrack.patientservice.service.PatientService;

@Service
public class PatientServiceImpl implements PatientService {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private VisitRepository visitRepository;

    @Autowired
    private AuditClient auditClient;

    @Override
    public PatientResponseDTO addPatient(PatientRequestDTO dto) {
        Patient patient = new Patient();
        mapDtoToEntity(dto, patient);
        Patient savedPatient = patientRepository.save(patient);
        audit("CREATE", savedPatient.getPatientId());
        return toResponseDTO(savedPatient);
    }

    private void mapDtoToEntity(PatientRequestDTO dto, Patient patient) {
        patient.setFirstName(dto.getFirstName());
        patient.setLastName(dto.getLastName());
        patient.setDateOfBirth(dto.getDateOfBirth());
        patient.setGender(dto.getGender());
        patient.setContactNumber(dto.getContactNumber());
        patient.setEmail(dto.getEmail());
        patient.setAddress(dto.getAddress());
        patient.setEnrollmentStatus(dto.getEnrollmentStatus());
        patient.setSiteId(dto.getSiteId());
        patient.setProtocolId(dto.getProtocolId());
        // Only set creator info on first save (never overwrite with null on update)
        if (dto.getCreatedByName() != null)   patient.setCreatedByName(dto.getCreatedByName());
        if (dto.getCreatedByUserId() != null) patient.setCreatedByUserId(dto.getCreatedByUserId());
        // Satisfy legacy NOT NULL DB columns (name, dob, contact_info)
        patient.setName((dto.getFirstName() != null ? dto.getFirstName() : "") + " "
                      + (dto.getLastName()  != null ? dto.getLastName()  : ""));
        patient.setDob(dto.getDateOfBirth() != null ? dto.getDateOfBirth() : "");
        patient.setContactInfo(dto.getContactNumber() != null ? dto.getContactNumber() : "");
    }

    @Override
    public List<PatientResponseDTO> getAllPatients() {
        return patientRepository.findByDeletedFalse().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public PatientResponseDTO getPatientById(Long id) throws IdNotFoundException {
        Patient patient = patientRepository.findByPatientIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + id));
        return toResponseDTO(patient);
    }

    @Override
    public PatientResponseDTO updatePatient(Long id, PatientRequestDTO dto) throws IdNotFoundException {
        Patient patient = patientRepository.findByPatientIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + id));
        mapDtoToEntity(dto, patient);
        Patient updatedPatient = patientRepository.save(patient);
        audit("UPDATE", updatedPatient.getPatientId());
        return toResponseDTO(updatedPatient);
    }

    @Override
    public String deletePatient(Long id) throws IdNotFoundException {
        Patient patient = patientRepository.findByPatientIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + id));
        patient.setDeleted(true);
        patientRepository.save(patient);
        audit("DELETE", id);
        return "Patient soft-deleted successfully with ID: " + id;
    }

    @Override
    public List<PatientResponseDTO> getDeletedPatients() {
        return patientRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public PatientResponseDTO restorePatient(Long id) throws IdNotFoundException {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + id));
        patient.setDeleted(false);
        Patient restored = patientRepository.save(patient);
        audit("RESTORE", id);
        return toResponseDTO(restored);
    }

    @Override
    public List<PatientResponseDTO> getPatientsBySite(Long siteId) {
        return patientRepository.findBySiteIdAndDeletedFalse(siteId).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public List<PatientResponseDTO> getPatientsByProtocol(Long protocolId) {
        return patientRepository.findByProtocolIdAndDeletedFalse(protocolId).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public List<PatientResponseDTO> getPatientsByStatus(EnrollmentStatus status) {
        return patientRepository.findByEnrollmentStatusAndDeletedFalse(status).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public PatientResponseDTO updateEnrollmentStatus(Long id, EnrollmentStatus status) throws IdNotFoundException {
        Patient patient = patientRepository.findByPatientIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + id));
        patient.setEnrollmentStatus(status);
        Patient updatedPatient = patientRepository.save(patient);
        audit("UPDATE", updatedPatient.getPatientId());
        return toResponseDTO(updatedPatient);
    }

    @Override
    public List<VisitResponseDTO> getPatientHistory(Long patientId) throws IdNotFoundException {
        patientRepository.findById(patientId)
                .orElseThrow(() -> new IdNotFoundException("Patient not found with ID: " + patientId));
        return visitRepository.findByPatient_PatientId(patientId).stream()
                .map(this::toVisitResponseDTO).collect(Collectors.toList());
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
                    action, "PATIENT", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private PatientResponseDTO toResponseDTO(Patient patient) {
        return new PatientResponseDTO(
                patient.getPatientId(),
                patient.getFirstName(),
                patient.getLastName(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getContactNumber(),
                patient.getEmail(),
                patient.getAddress(),
                patient.getEnrollmentStatus(),
                patient.getSiteId(),
                patient.getProtocolId(),
                patient.getCreatedByName(),
                patient.getCreatedByUserId()
        );
    }

    private VisitResponseDTO toVisitResponseDTO(Visit visit) {
        return new VisitResponseDTO(
                visit.getVisitId(),
                visit.getPatient() != null ? visit.getPatient().getPatientId() : null,
                visit.getProtocolId(), visit.getSiteId(),
                visit.getVisitType(), visit.getVisitDate(), visit.getStatus(), visit.getNotes(),
                visit.getCreatedByName(), visit.getCreatedByUserId()
        );
    }
}
