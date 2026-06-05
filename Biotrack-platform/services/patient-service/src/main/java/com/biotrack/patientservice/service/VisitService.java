package com.biotrack.patientservice.service;

import java.util.List;
import com.biotrack.patientservice.dto.request.VisitRequestDTO;
import com.biotrack.patientservice.dto.response.VisitResponseDTO;
import com.biotrack.patientservice.exception.IdNotFoundException;

public interface VisitService {

    VisitResponseDTO addVisit(VisitRequestDTO dto);

    List<VisitResponseDTO> getAllVisits();

    VisitResponseDTO getVisitById(Long id) throws IdNotFoundException;

    VisitResponseDTO updateVisit(Long id, VisitRequestDTO dto) throws IdNotFoundException;

    String deleteVisit(Long id) throws IdNotFoundException;

    List<VisitResponseDTO> getVisitsByPatient(Long patientId) throws IdNotFoundException;

    List<VisitResponseDTO> getDeletedVisits() throws IdNotFoundException;
    VisitResponseDTO restoreVisit(Long id) throws IdNotFoundException;
}
