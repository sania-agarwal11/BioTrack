package com.biotrack.notificationsservice.client;

import com.biotrack.notificationsservice.dto.AuditEventDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "compliance-service")
public interface AuditClient {

    @PostMapping("/api/v1/audit-logs")
    void logAudit(@RequestBody AuditEventDTO dto);
}
