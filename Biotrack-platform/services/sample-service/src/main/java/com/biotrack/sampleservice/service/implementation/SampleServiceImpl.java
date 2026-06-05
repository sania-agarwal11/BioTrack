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
import com.biotrack.sampleservice.client.AuditClient;
import com.biotrack.sampleservice.dto.AuditEventDTO;
import com.biotrack.sampleservice.dto.request.SampleRequestDTO;
import com.biotrack.sampleservice.dto.response.SampleResponseDTO;
import com.biotrack.sampleservice.dto.response.SampleStatusHistoryResponseDTO;
import com.biotrack.sampleservice.entity.Sample;
import com.biotrack.sampleservice.entity.SampleStatusHistory;
import com.biotrack.sampleservice.enums.SampleStatus;
import com.biotrack.sampleservice.exception.IdNotFoundException;
import com.biotrack.sampleservice.repository.SampleRepository;
import com.biotrack.sampleservice.repository.SampleStatusHistoryRepository;
import com.biotrack.sampleservice.service.SampleService;

@Service
public class SampleServiceImpl implements SampleService {

    @Autowired
    private SampleRepository sampleRepository;

    @Autowired
    private SampleStatusHistoryRepository statusHistoryRepository;

    @Autowired
    private AuditClient auditClient;

    @Override
    public SampleResponseDTO addSample(SampleRequestDTO dto) {
        Sample sample = new Sample();
        mapDtoToEntity(dto, sample);
        Sample savedSample = sampleRepository.save(sample);
        audit("CREATE", savedSample.getSampleId());
        recordStatusHistory(savedSample.getSampleId(), savedSample.getStatus().name(),
                "Initial status on creation");
        return toResponseDTO(savedSample);
    }

    @Override
    public List<SampleResponseDTO> getAllSamples() {
        return sampleRepository.findByDeletedFalse().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public SampleResponseDTO getSampleById(Long id) throws IdNotFoundException {
        Sample sample = sampleRepository.findBySampleIdAndDeletedFalse(id)
                .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + id));
        return toResponseDTO(sample);
    }

    @Override
    public SampleResponseDTO updateSample(Long id, SampleRequestDTO dto) throws IdNotFoundException {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + id));
        SampleStatus oldStatus = sample.getStatus();
        mapDtoToEntity(dto, sample);
        Sample updatedSample = sampleRepository.save(sample);
        audit("UPDATE", updatedSample.getSampleId());
        if (oldStatus != updatedSample.getStatus()) {
            recordStatusHistory(updatedSample.getSampleId(), updatedSample.getStatus().name(),
                    "Status updated from " + oldStatus.name());
        }
        return toResponseDTO(updatedSample);
    }

    @Override
    public String deleteSample(Long id) throws IdNotFoundException {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + id));
        sample.setDeleted(true);
        sampleRepository.save(sample);
        audit("DELETE", id);
        return "Sample soft-deleted successfully with ID: " + id;
    }

    @Override
    public List<SampleResponseDTO> getSamplesByProtocol(Long protocolId) {
        return sampleRepository.findByProtocolIdAndDeletedFalse(protocolId).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public List<SampleResponseDTO> getSamplesByPatient(Long patientId) {
        return sampleRepository.findByPatientIdAndDeletedFalse(patientId).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public SampleResponseDTO updateSampleStatus(Long id, SampleStatus status) throws IdNotFoundException {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + id));
        SampleStatus oldStatus = sample.getStatus();
        sample.setStatus(status);
        Sample updatedSample = sampleRepository.save(sample);
        audit("UPDATE", updatedSample.getSampleId());
        if (oldStatus != status) {
            recordStatusHistory(updatedSample.getSampleId(), status.name(),
                    "Status changed from " + oldStatus.name() + " to " + status.name());
        }
        return toResponseDTO(updatedSample);
    }

    @Override
    public SampleResponseDTO disposeSample(Long id) throws IdNotFoundException {
        return updateSampleStatus(id, SampleStatus.DISPOSED);
    }

    @Override
    public List<SampleStatusHistoryResponseDTO> getStatusHistory(Long sampleId) {
        return statusHistoryRepository.findBySampleIdOrderByChangedAtAsc(sampleId)
                .stream()
                .map(h -> new SampleStatusHistoryResponseDTO(
                        h.getHistoryId(),
                        h.getSampleId(),
                        h.getStatus(),
                        h.getChangedAt() != null ? h.getChangedAt().toString() : null,
                        h.getChangedBy(),
                        h.getNotes()))
                .collect(Collectors.toList());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void mapDtoToEntity(SampleRequestDTO dto, Sample sample) {
        sample.setPatientId(dto.getPatientId());
        sample.setProtocolId(dto.getProtocolId());
        // siteId is NOT NULL in DB — default to 0 when not provided
        sample.setSiteId(dto.getSiteId() != null ? dto.getSiteId() : 0L);
        sample.setSampleType(dto.getSampleType());
        sample.setStorageLocation(dto.getStorageLocation());
        sample.setNotes(dto.getNotes());
        sample.setStatus(dto.getStatus() != null ? dto.getStatus() : SampleStatus.COLLECTED);
        // Parse date safely
        if (dto.getCollectionDate() != null && !dto.getCollectionDate().isBlank()) {
            sample.setCollectedDate(LocalDate.parse(dto.getCollectionDate()));
        } else {
            sample.setCollectedDate(LocalDate.now());
        }
    }

    private void recordStatusHistory(Long sampleId, String status, String notes) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String changedBy = auth != null ? auth.getName() : null;
            SampleStatusHistory history = new SampleStatusHistory();
            history.setSampleId(sampleId);
            history.setStatus(status);
            history.setChangedAt(LocalDateTime.now());
            history.setChangedBy(changedBy);
            history.setNotes(notes);
            statusHistoryRepository.save(history);
        } catch (Exception ignored) {
            // History recording must not break main operation
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
                    action, "SAMPLE", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    @Override
    public List<SampleResponseDTO> getDeletedSamples() {
        return sampleRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public SampleResponseDTO restoreSample(Long id) throws IdNotFoundException {
        Sample sample = sampleRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Sample not found with ID: " + id));
        sample.setDeleted(false);
        Sample restored = sampleRepository.save(sample);
        audit("RESTORE", id);
        return toResponseDTO(restored);
    }

    private SampleResponseDTO toResponseDTO(Sample sample) {
        return new SampleResponseDTO(
                sample.getSampleId(),
                sample.getPatientId(),
                sample.getProtocolId(),
                sample.getSiteId(),
                sample.getSampleType(),
                sample.getCollectedDate() != null ? sample.getCollectedDate().toString() : null,
                sample.getStorageLocation(),
                sample.getStatus(),
                sample.getNotes()
        );
    }
}
