package com.biotrack.analyticsservice.client;

import com.biotrack.analyticsservice.dto.external.ProtocolSummaryDTO;
import com.biotrack.analyticsservice.dto.external.SiteSummaryDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "protocol-client", url = "${services.protocol.url:http://localhost:8086}")
public interface ProtocolClient {

    @GetMapping("/api/v1/protocols")
    List<ProtocolSummaryDTO> getAllProtocols();

    @GetMapping("/api/v1/sites")
    List<SiteSummaryDTO> getAllSites();
}
