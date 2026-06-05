package com.biotrack.iamservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Fire-and-forget client that posts audit events (LOGIN / LOGOUT) to
 * the compliance-service. Failures are silently swallowed so they never
 * break the main authentication flow.
 */
@Service
public class AuditLogClient {

    @Value("${compliance.service.url:http://localhost:8085}")
    private String complianceServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * @param userId       numeric user ID (may be null for anonymous)
     * @param email        JWT subject / user email
     * @param userName     display name e.g. "Sania Agarwal"
     * @param userRole     role string e.g. "ADMIN"
     * @param action       "LOGIN" or "LOGOUT"
     * @param resourceType always "AUTH" for login/logout events
     * @param jwtToken     the user's current JWT (forwarded as Authorization header)
     */
    public void logEvent(Long userId, String email, String userName, String userRole,
                         String action, String resourceType, String jwtToken) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("userId",       userId);
            body.put("performedBy",  email);
            body.put("userName",     userName);
            body.put("userRole",     userRole);
            body.put("action",       action);
            body.put("resourceType", resourceType);
            body.put("timestamp",    LocalDateTime.now().toString());
            // protocolId is null for auth events — omit the key entirely

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (jwtToken != null && !jwtToken.isBlank()) {
                headers.set("Authorization", "Bearer " + jwtToken);
            }

            restTemplate.postForEntity(
                    complianceServiceUrl + "/api/v1/audit-logs",
                    new HttpEntity<>(body, headers),
                    Object.class
            );
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must never break login / logout
        }
    }
}
