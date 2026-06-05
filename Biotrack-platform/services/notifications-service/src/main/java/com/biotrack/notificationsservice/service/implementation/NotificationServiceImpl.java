package com.biotrack.notificationsservice.service.implementation;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.biotrack.notificationsservice.client.AuditClient;
import com.biotrack.notificationsservice.dto.AuditEventDTO;
import com.biotrack.notificationsservice.dto.request.NotificationRequestDTO;
import com.biotrack.notificationsservice.dto.response.NotificationResponseDTO;
import com.biotrack.notificationsservice.entity.Notification;
import com.biotrack.notificationsservice.enums.NotificationStatus;
import com.biotrack.notificationsservice.enums.NotificationType;
import com.biotrack.notificationsservice.exception.IdNotFoundException;
import com.biotrack.notificationsservice.repository.NotificationRepository;
import com.biotrack.notificationsservice.service.EmailService;
import com.biotrack.notificationsservice.service.NotificationService;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final AuditClient auditClient;
    private final EmailService emailService;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   AuditClient auditClient,
                                   EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.auditClient = auditClient;
        this.emailService = emailService;
    }

    @Override
    public NotificationResponseDTO addNotification(NotificationRequestDTO dto) {
        NotificationType type = (dto.getType() != null && !dto.getType().isBlank())
                ? NotificationType.valueOf(dto.getType())
                : NotificationType.INFO;
        NotificationStatus status = (dto.getStatus() != null && !dto.getStatus().isBlank())
                ? NotificationStatus.valueOf(dto.getStatus())
                : NotificationStatus.UNREAD;
        String createdDate = (dto.getCreatedDate() != null && !dto.getCreatedDate().isBlank())
                ? dto.getCreatedDate()
                : LocalDateTime.now().toString();

        Notification notification = new Notification(
                dto.getUserId(),
                dto.getTitle(),
                dto.getMessage(),
                type,
                status,
                createdDate,
                dto.getRecipientEmail()
        );
        notification.setSenderUserId(dto.getSenderUserId());
        Notification saved = notificationRepository.save(notification);
        NotificationResponseDTO response = toResponseDTO(saved);
        audit("CREATE", saved.getNotificationId());
        sendEmailIfRequired(notification.getType(), dto.getRecipientEmail(), dto.getMessage());
        return response;
    }

    @Override
    public List<NotificationResponseDTO> getAllNotifications() {
        return notificationRepository.findByDeletedFalse().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public NotificationResponseDTO getNotificationById(Long id) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));
        if (notification.isDeleted()) throw new IdNotFoundException("Notification not found with id: " + id);
        return toResponseDTO(notification);
    }

    @Override
    public NotificationResponseDTO updateNotification(Long id, NotificationRequestDTO dto) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));

        notification.setUserId(dto.getUserId());
        notification.setTitle(dto.getTitle());
        notification.setMessage(dto.getMessage());
        if (dto.getType() != null && !dto.getType().isBlank())
            notification.setType(NotificationType.valueOf(dto.getType()));
        if (dto.getStatus() != null && !dto.getStatus().isBlank())
            notification.setStatus(NotificationStatus.valueOf(dto.getStatus()));
        if (dto.getCreatedDate() != null && !dto.getCreatedDate().isBlank())
            notification.setCreatedDate(dto.getCreatedDate());
        notification.setRecipientEmail(dto.getRecipientEmail());

        NotificationResponseDTO response = toResponseDTO(notificationRepository.save(notification));
        audit("UPDATE", id);
        return response;
    }

    @Override
    public String deleteNotification(Long id) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));
        notification.setDeleted(true);
        notificationRepository.save(notification);
        audit("DELETE", id);
        return "Notification deleted successfully with ID: " + id;
    }

    @Override
    public List<NotificationResponseDTO> getNotificationsByUser(Long userId) {
        // Include received (targeted + broadcasts) AND sent-by-this-user notifications, excl. deleted
        return notificationRepository.findAllByUserInvolvement(userId).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public long getUnreadCount(Long userId) {
        // Include broadcast unread notifications in the count
        return notificationRepository.countByUserIdOrBroadcastAndStatus(userId, NotificationStatus.UNREAD);
    }

    @Override
    public NotificationResponseDTO markAsRead(Long id) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));
        notification.setStatus(NotificationStatus.READ);
        return toResponseDTO(notificationRepository.save(notification));
    }

    @Override
    public NotificationResponseDTO markAsUnread(Long id) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));
        notification.setStatus(NotificationStatus.UNREAD);
        return toResponseDTO(notificationRepository.save(notification));
    }

    @Override
    public NotificationResponseDTO archiveNotification(Long id) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));
        notification.setStatus(NotificationStatus.ARCHIVED);
        return toResponseDTO(notificationRepository.save(notification));
    }

    @Override
    public int markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrBroadcastAndStatus(userId, NotificationStatus.UNREAD);
        notifications.forEach(n -> n.setStatus(NotificationStatus.READ));
        notificationRepository.saveAll(notifications);
        return notifications.size();
    }

    @Override
    public String updatePreferences() {
        return "Notification preferences updated successfully.";
    }

    @Override
    public NotificationResponseDTO dispatchNotification(NotificationRequestDTO dto) {
        return addNotification(dto);
    }

    @Override
    public List<NotificationResponseDTO> getDeletedNotifications() {
        return notificationRepository.findByDeletedTrue().stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public List<NotificationResponseDTO> getDeletedNotificationsByUser(Long userId) {
        return notificationRepository.findDeletedByUserInvolvement(userId).stream().map(this::toResponseDTO).collect(Collectors.toList());
    }

    @Override
    public NotificationResponseDTO restoreNotification(Long id) throws IdNotFoundException {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("Notification not found with id: " + id));
        notification.setDeleted(false);
        Notification restored = notificationRepository.save(notification);
        audit("RESTORE", id);
        return toResponseDTO(restored);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────────────────────────────────

    private void sendEmailIfRequired(NotificationType type, String recipientEmail, String message) {
        if (type != NotificationType.EMAIL) return;
        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("EMAIL notification created but recipientEmail is missing — skipping delivery");
            return;
        }
        try {
            String subject = "BioTrack Platform Notification";
            String htmlBody = buildHtmlEmail(message);
            emailService.sendHtmlEmail(recipientEmail, subject, htmlBody);
        } catch (Exception e) {
            // Fire-and-forget: email failure must not break the main operation
            log.error("Email dispatch failed for {}: {}", recipientEmail, e.getMessage());
        }
    }

    private String buildHtmlEmail(String message) {
        return "<!DOCTYPE html>" +
               "<html><body style='font-family:Arial,sans-serif;color:#333;'>" +
               "<div style='max-width:600px;margin:0 auto;padding:24px;" +
               "border:1px solid #e0e0e0;border-radius:8px;'>" +
               "<h2 style='color:#1a5276;'>BioTrack Platform</h2>" +
               "<hr style='border:none;border-top:1px solid #e0e0e0;'/>" +
               "<p style='font-size:15px;line-height:1.6;'>" + message + "</p>" +
               "<hr style='border:none;border-top:1px solid #e0e0e0;'/>" +
               "<p style='font-size:12px;color:#888;'>This is an automated message from BioTrack." +
               " Please do not reply to this email.</p>" +
               "</div></body></html>";
    }

    private void audit(String action, Long entityId) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email    = auth.getName();
            Long   userId   = null;
            String userName = null;
            String userRole = null;
            if (auth instanceof UsernamePasswordAuthenticationToken token
                    && token.getDetails() instanceof java.util.Map<?, ?> details) {
                userId   = (Long)   details.get("userId");
                userName = (String) details.get("userName");
                userRole = (String) details.get("userRole");
            }
            auditClient.logAudit(new AuditEventDTO(
                    userId, email, userName, userRole,
                    action, "NOTIFICATION", LocalDateTime.now().toString(), entityId));
        } catch (Exception ignored) {
            // Fire-and-forget: audit failure must not break main operation
        }
    }

    private NotificationResponseDTO toResponseDTO(Notification notification) {
        return new NotificationResponseDTO(
                notification.getNotificationId(),
                notification.getUserId(),
                notification.getSenderUserId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType().name(),
                notification.getStatus().name(),
                notification.getCreatedDate(),
                notification.getRecipientEmail()
        );
    }
}
