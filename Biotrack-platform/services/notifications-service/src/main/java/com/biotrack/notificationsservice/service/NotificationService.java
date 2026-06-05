package com.biotrack.notificationsservice.service;

import java.util.List;
import com.biotrack.notificationsservice.dto.request.NotificationRequestDTO;
import com.biotrack.notificationsservice.dto.response.NotificationResponseDTO;
import com.biotrack.notificationsservice.exception.IdNotFoundException;

public interface NotificationService {

    NotificationResponseDTO addNotification(NotificationRequestDTO dto);

    List<NotificationResponseDTO> getAllNotifications();

    NotificationResponseDTO getNotificationById(Long id) throws IdNotFoundException;

    NotificationResponseDTO updateNotification(Long id, NotificationRequestDTO dto) throws IdNotFoundException;

    String deleteNotification(Long id) throws IdNotFoundException;

    List<NotificationResponseDTO> getNotificationsByUser(Long userId);

    long getUnreadCount(Long userId);

    NotificationResponseDTO markAsRead(Long id) throws IdNotFoundException;

    NotificationResponseDTO markAsUnread(Long id) throws IdNotFoundException;

    NotificationResponseDTO archiveNotification(Long id) throws IdNotFoundException;

    int markAllAsRead(Long userId);

    // ✅ Placeholder for future preferences logic
    String updatePreferences();

    NotificationResponseDTO dispatchNotification(NotificationRequestDTO dto);

    List<NotificationResponseDTO> getDeletedNotifications();
    List<NotificationResponseDTO> getDeletedNotificationsByUser(Long userId);
    NotificationResponseDTO restoreNotification(Long id) throws IdNotFoundException;
}
