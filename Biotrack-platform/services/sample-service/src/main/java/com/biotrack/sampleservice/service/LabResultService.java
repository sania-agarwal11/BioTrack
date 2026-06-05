package com.biotrack.sampleservice.service;

import java.util.List;
import com.biotrack.sampleservice.dto.request.LabResultRequestDTO;
import com.biotrack.sampleservice.dto.response.LabResultResponseDTO;
import com.biotrack.sampleservice.exception.IdNotFoundException;

public interface LabResultService {

    LabResultResponseDTO addLabResult(LabResultRequestDTO dto);

    List<LabResultResponseDTO> getAllLabResults();

    LabResultResponseDTO getLabResultById(Long id) throws IdNotFoundException;

    LabResultResponseDTO updateLabResult(Long id, LabResultRequestDTO dto) throws IdNotFoundException;

    String deleteLabResult(Long id) throws IdNotFoundException;

    LabResultResponseDTO getLabResultBySampleId(Long sampleId) throws IdNotFoundException;

    List<LabResultResponseDTO> getDeletedLabResults();
    LabResultResponseDTO restoreLabResult(Long id) throws IdNotFoundException;
}
