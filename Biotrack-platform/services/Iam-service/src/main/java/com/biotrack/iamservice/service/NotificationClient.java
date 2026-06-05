package com.biotrack.iamservice.service;

import com.biotrack.iamservice.entity.User;
import com.biotrack.iamservice.enums.Role;
import com.biotrack.iamservice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fire-and-forget client that posts notifications to the notifications-service.
 * Uses the unauthenticated /internal endpoint so no JWT is required.
 * Failures are logged but never break the main registration flow.
 *
 * Registration notifications are sent ONLY to ADMIN users (targeted by userId),
 * so they never appear in non-admin notification feeds.
 */
@Service
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    @Value("${notifications.service.url:http://localhost:8084}")
    private String notificationsServiceUrl;

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;

    public NotificationClient(UserRepository userRepository) {
        this.restTemplate   = new RestTemplate();
        this.userRepository = userRepository;
    }

    /**
     * Posts a targeted new-registration notification to every ADMIN user.
     * Each notification is stored with the admin's userId so it only appears
     * in that admin's feed — non-admin users never see it.
     *
     * @param userName  display name of the newly registered user
     * @param userEmail email of the newly registered user
     */
    public void sendRegistrationNotification(String userName, String userEmail) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);

        if (admins.isEmpty()) {
            log.warn("No ADMIN users found — registration notification not sent for: {}", userEmail);
            return;
        }

        String message = "User \"" + userName + "\" (" + userEmail
                + ") has registered and is awaiting your approval. Go to User Management to approve or reject.";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        for (User admin : admins) {
            try {
                Map<String, Object> body = new HashMap<>();
                body.put("title",   "New Registration Request");
                body.put("message", message);
                body.put("type",    "INFO");
                body.put("status",  "UNREAD");
                body.put("userId",  admin.getUserId());   // targeted — only this admin sees it

                restTemplate.postForEntity(
                        notificationsServiceUrl + "/api/v1/notifications/internal",
                        new HttpEntity<>(body, headers),
                        Object.class
                );
                log.info("Registration notification sent to admin {} (id={}) for new user: {}",
                        admin.getEmail(), admin.getUserId(), userEmail);
            } catch (Exception e) {
                log.warn("Failed to notify admin {} for new user {}: {}",
                        admin.getEmail(), userEmail, e.getMessage());
            }
        }
    }
}
