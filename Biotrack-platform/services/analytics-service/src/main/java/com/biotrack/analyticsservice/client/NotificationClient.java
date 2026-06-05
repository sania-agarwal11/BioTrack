package com.biotrack.analyticsservice.client;

import com.biotrack.analyticsservice.dto.external.NotificationSummaryDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@FeignClient(name = "notification-client", url = "${services.notification.url:http://localhost:8084}")
public interface NotificationClient {

    @GetMapping("/api/v1/notifications")
    List<NotificationSummaryDTO> getAllNotifications();
}
