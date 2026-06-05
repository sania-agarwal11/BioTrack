package com.biotrack.analyticsservice.client;

import com.biotrack.analyticsservice.dto.external.PatientSummaryDTO;
import com.biotrack.analyticsservice.dto.external.VisitSummaryDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "patient-client", url = "${services.patient.url:http://localhost:8082}")
public interface PatientClient {

    @GetMapping("/api/v1/patients")
    List<PatientSummaryDTO> getAllPatients();

    @GetMapping("/api/v1/visits")
    List<VisitSummaryDTO> getAllVisits();
}
