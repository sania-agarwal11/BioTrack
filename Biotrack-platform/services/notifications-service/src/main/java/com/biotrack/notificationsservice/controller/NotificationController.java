package com.biotrack.notificationsservice.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.biotrack.notificationsservice.dto.request.NotificationRequestDTO;
import com.biotrack.notificationsservice.dto.response.NotificationResponseDTO;
import com.biotrack.notificationsservice.service.NotificationService;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // All authenticated roles can create/send notifications
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<NotificationResponseDTO> addNotification(@RequestBody NotificationRequestDTO dto) {
        return new ResponseEntity<>(notificationService.addNotification(dto), HttpStatus.CREATED);
    }

    // Only ADMIN can view ALL notifications across all users
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NotificationResponseDTO>> getAllNotifications() {
        return new ResponseEntity<>(notificationService.getAllNotifications(), HttpStatus.OK);
    }

    // All authenticated roles can read their own notifications
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<List<NotificationResponseDTO>> getNotificationsByUser(@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.getNotificationsByUser(userId), HttpStatus.OK);
    }

    // All authenticated roles can check unread count
    @GetMapping("/user/{userId}/unread")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.getUnreadCount(userId), HttpStatus.OK);
    }

    // All authenticated roles can get a notification by ID
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<NotificationResponseDTO> getNotificationById(@PathVariable Long id) {
        return new ResponseEntity<>(notificationService.getNotificationById(id), HttpStatus.OK);
    }

    // Only ADMIN can update a notification record
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationResponseDTO> updateNotification(@PathVariable Long id,
                                                                      @RequestBody NotificationRequestDTO dto) {
        return new ResponseEntity<>(notificationService.updateNotification(id, dto), HttpStatus.OK);
    }

    // All authenticated users can delete (their own) notifications
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<String> deleteNotification(@PathVariable Long id) {
        return new ResponseEntity<>(notificationService.deleteNotification(id), HttpStatus.OK);
    }

    // All authenticated roles can mark as read
    @PutMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<NotificationResponseDTO> markAsRead(@PathVariable Long id) {
        return new ResponseEntity<>(notificationService.markAsRead(id), HttpStatus.OK);
    }

    // All authenticated roles can mark as unread
    @PutMapping("/{id}/unread")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<NotificationResponseDTO> markAsUnread(@PathVariable Long id) {
        return new ResponseEntity<>(notificationService.markAsUnread(id), HttpStatus.OK);
    }

    // All authenticated roles can archive a notification
    @PutMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<NotificationResponseDTO> archiveNotification(@PathVariable Long id) {
        return new ResponseEntity<>(notificationService.archiveNotification(id), HttpStatus.OK);
    }

    // All authenticated roles can mark all as read
    @PutMapping("/user/{userId}/read-all")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<Integer> markAllAsRead(@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.markAllAsRead(userId), HttpStatus.OK);
    }

    // All authenticated roles can update preferences
    @PostMapping("/preferences")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<String> updatePreferences() {
        return new ResponseEntity<>(notificationService.updatePreferences(), HttpStatus.OK);
    }

    // All authenticated roles can dispatch notifications
    @PostMapping("/dispatch")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<NotificationResponseDTO> dispatchNotification(@RequestBody NotificationRequestDTO dto) {
        return new ResponseEntity<>(notificationService.dispatchNotification(dto), HttpStatus.CREATED);
    }

    // ADMIN sees ALL deleted notifications
    @GetMapping("/deleted")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<NotificationResponseDTO>> getDeletedNotifications() {
        return new ResponseEntity<>(notificationService.getDeletedNotifications(), HttpStatus.OK);
    }

    // All authenticated roles can see their own deleted notifications
    @GetMapping("/user/{userId}/deleted")
    @PreAuthorize("hasAnyRole('ADMIN','CLINICAL_TRIAL_MANAGER','LAB_TECHNICIAN','RESEARCH_SCIENTIST','REGULATORY_OFFICER','DATA_MANAGER','INVESTIGATOR')")
    public ResponseEntity<List<NotificationResponseDTO>> getDeletedNotificationsByUser(@PathVariable Long userId) {
        return new ResponseEntity<>(notificationService.getDeletedNotificationsByUser(userId), HttpStatus.OK);
    }

    @PutMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<NotificationResponseDTO> restoreNotification(@PathVariable Long id) {
        return new ResponseEntity<>(notificationService.restoreNotification(id), HttpStatus.OK);
    }

    /**
     * Internal endpoint — no JWT required.
     * Used by other microservices (e.g. IAM) to post system notifications
     * without a user token (e.g. new registration alerts for admin).
     * Secured by network isolation, not by JWT.
     */
    @PostMapping("/internal")
    public ResponseEntity<NotificationResponseDTO> createInternalNotification(@RequestBody NotificationRequestDTO dto) {
        // Force type to INFO and status to UNREAD if not provided
        if (dto.getType() == null || dto.getType().isBlank()) dto.setType("INFO");
        if (dto.getStatus() == null || dto.getStatus().isBlank()) dto.setStatus("UNREAD");
        return new ResponseEntity<>(notificationService.addNotification(dto), HttpStatus.CREATED);
    }
}
