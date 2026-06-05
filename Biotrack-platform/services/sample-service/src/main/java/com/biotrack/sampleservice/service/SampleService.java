package com.biotrack.sampleservice.service;

import java.util.List;
import com.biotrack.sampleservice.dto.request.SampleRequestDTO;
import com.biotrack.sampleservice.dto.response.SampleResponseDTO;
import com.biotrack.sampleservice.dto.response.SampleStatusHistoryResponseDTO;
import com.biotrack.sampleservice.enums.SampleStatus;
import com.biotrack.sampleservice.exception.IdNotFoundException;

public interface SampleService {

    SampleResponseDTO addSample(SampleRequestDTO dto);

    List<SampleResponseDTO> getAllSamples();

    SampleResponseDTO getSampleById(Long id) throws IdNotFoundException;

    SampleResponseDTO updateSample(Long id, SampleRequestDTO dto) throws IdNotFoundException;

    String deleteSample(Long id) throws IdNotFoundException;

    List<SampleResponseDTO> getSamplesByProtocol(Long protocolId);

    List<SampleResponseDTO> getSamplesByPatient(Long patientId);

    SampleResponseDTO updateSampleStatus(Long id, SampleStatus status) throws IdNotFoundException;

    SampleResponseDTO disposeSample(Long id) throws IdNotFoundException;

    List<SampleStatusHistoryResponseDTO> getStatusHistory(Long sampleId);

    List<SampleResponseDTO> getDeletedSamples();
    SampleResponseDTO restoreSample(Long id) throws IdNotFoundException;
}
