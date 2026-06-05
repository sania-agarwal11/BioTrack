package com.biotrack.analyticsservice.client;

import com.biotrack.analyticsservice.dto.external.LabResultSummaryDTO;
import com.biotrack.analyticsservice.dto.external.SampleSummaryDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "sample-client", url = "${services.sample.url:http://localhost:8083}")
public interface SampleClient {

    @GetMapping("/api/v1/samples")
    List<SampleSummaryDTO> getAllSamples();

    @GetMapping("/api/v1/lab-results")
    List<LabResultSummaryDTO> getAllLabResults();
}
