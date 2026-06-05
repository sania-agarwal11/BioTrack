package com.biotrack.sampleservice.service.implementation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.biotrack.sampleservice.client.AuditClient;
import com.biotrack.sampleservice.dto.AuditEventDTO;
import com.biotrack.sampleservice.dto.request.LabResultRequestDTO;
import com.biotrack.sampleservice.dto.response.LabResultResponseDTO;
import com.biotrack.sampleservice.entity.LabResult;
import com.biotrack.sampleservice.entity.Sample;
import com.biotrack.sampleservice.enums.LabResultStatus;
import com.biotrack.sampleservice.exception.IdNotFoundException;
import com.biotrack.sampleservice.repository.LabResultRepository;
import com.biotrack.sampleservice.repository.SampleRepository;
import com.biotrack.sampleservice.service.LabResultService;

@Service
public class LabResultServiceImpl implements LabResultService {

    @Autowired
    private LabResultRepository labResultRepository;

    @Autowired
    private SampleRepository sampleRepository;

    @Autowired
    private AuditClient auditClient;

    @Override
    public LabResultResponseDTO addLabResult(LabResultRequestDTO dto) {
        Sample sample = sampleRepository.findById(dto.getSampleId())
                .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + dto.getSampleId()));

        LabResult labResult = new LabResult();
        labResult.setSample(sample);
        mapDtoToEntity(dto, labResult);

        LabResult savedLabResult = labResultRepository.save(labResult);
        audit("CREATE", savedLabResult.getResultId());
        return toResponseDTO(savedLabResult);
    }

    @Override
    public List<LabResultResponseDTO> getAllLabResults() {
        return labResultRepository.findByDeletedFalse()
                .stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public LabResultResponseDTO getLabResultById(Long id) throws IdNotFoundException {
        LabResult labResult = labResultRepository.findByResultIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("LabResult not found with ID: " + id));
        return toResponseDTO(labResult);
    }

    @Override
    public LabResultResponseDTO updateLabResult(Long id, LabResultRequestDTO dto) throws IdNotFoundException {
        LabResult labResult = labResultRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("LabResult not found with ID: " + id));

        if (dto.getSampleId() != null) {
            Sample sample = sampleRepository.findById(dto.getSampleId())
                    .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + dto.getSampleId()));
            labResult.setSample(sample);
        }
        mapDtoToEntity(dto, labResult);

        LabResult updatedLabResult = labResultRepository.save(labResult);
        audit("UPDATE", updatedLabResult.getResultId());
        return toResponseDTO(updatedLabResult);
    }

    @Override
    public String deleteLabResult(Long id) throws IdNotFoundException {
        LabResult labResult = labResultRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("LabResult not found with ID: " + id));
        labResult.setDeleted(true);
        labResultRepository.save(labResult);
        audit("DELETE", id);
        return "LabResult soft-deleted successfully with ID: " + id;
    }

    @Override
    public LabResultResponseDTO getLabResultBySampleId(Long sampleId) throws IdNotFoundException {
        LabResult labResult = labResultRepository.findBySample_SampleId(sampleId)
                .orElseThrow(() -> new IdNotFoundException("LabResult not found for sample ID: " + sampleId));
        return toResponseDTO(labResult);
    }

    @Override
    public List<LabResultResponseDTO> getDeletedLabResults() {
        return labResultRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public LabResultResponseDTO restoreLabResult(Long id) throws IdNotFoundException {
        LabResult labResult = labResultRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("LabResult not found with ID: " + id));
        labResult.setDeleted(false);
        LabResult restored = labResultRepository.save(labResult);
        audit("RESTORE", id);
        return toResponseDTO(restored);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void mapDtoToEntity(LabResultRequestDTO dto, LabResult entity) {
        entity.setTestType(dto.getTestName());
        entity.setResultValue(dto.getResult() != null ? dto.getResult() : "");
        entity.setUnit(dto.getUnit());
        entity.setReferenceRange(dto.getReferenceRange());
        entity.setPerformedBy(dto.getPerformedBy());
        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : LabResultStatus.PENDING);
        entity.setReviewNotes(dto.getReviewNotes());
        entity.setRejectionReason(dto.getRejectionReason());
        if (dto.getPerformedDate() != null && !dto.getPerformedDate().isBlank()) {
            entity.setDate(LocalDate.parse(dto.getPerformedDate()));
        } else {
            entity.setDate(LocalDate.now());
        }
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
                    action, "LAB_RESULT", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private LabResultResponseDTO toResponseDTO(LabResult labResult) {
        return new LabResultResponseDTO(
                labResult.getResultId(),
                labResult.getSample() != null ? labResult.getSample().getSampleId() : null,
                labResult.getTestType(),
                labResult.getResultValue(),
                labResult.getUnit(),
                labResult.getReferenceRange(),
                labResult.getStatus(),
                labResult.getPerformedBy(),
                labResult.getDate() != null ? labResult.getDate().toString() : null,
                labResult.getReviewNotes(),
                labResult.getRejectionReason()
        );
    }
}
