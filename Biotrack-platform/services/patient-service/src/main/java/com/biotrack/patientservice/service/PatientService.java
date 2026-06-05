package com.biotrack.patientservice.service;

import java.util.List;
import com.biotrack.patientservice.dto.request.PatientRequestDTO;
import com.biotrack.patientservice.dto.response.PatientResponseDTO;
import com.biotrack.patientservice.dto.response.VisitResponseDTO;
import com.biotrack.patientservice.enums.EnrollmentStatus;
import com.biotrack.patientservice.exception.IdNotFoundException;

public interface PatientService {

    PatientResponseDTO addPatient(PatientRequestDTO dto);

    List<PatientResponseDTO> getAllPatients();

    PatientResponseDTO getPatientById(Long id) throws IdNotFoundException;

    PatientResponseDTO updatePatient(Long id, PatientRequestDTO dto) throws IdNotFoundException;

    String deletePatient(Long id) throws IdNotFoundException;

    List<PatientResponseDTO> getDeletedPatients();

    PatientResponseDTO restorePatient(Long id) throws IdNotFoundException;

    List<PatientResponseDTO> getPatientsBySite(Long siteId);

    List<PatientResponseDTO> getPatientsByProtocol(Long protocolId);

    List<PatientResponseDTO> getPatientsByStatus(EnrollmentStatus status);

    PatientResponseDTO updateEnrollmentStatus(Long id, EnrollmentStatus status) throws IdNotFoundException;

    List<VisitResponseDTO> getPatientHistory(Long patientId);
}
