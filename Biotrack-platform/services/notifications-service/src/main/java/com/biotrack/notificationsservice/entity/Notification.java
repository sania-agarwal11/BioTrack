package com.biotrack.notificationsservice.entity;

import jakarta.persistence.*;
import com.biotrack.notificationsservice.enums.NotificationStatus;
import com.biotrack.notificationsservice.enums.NotificationType;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long notificationId;

    @Column(nullable = true)
    private Long userId;

    @Column(nullable = true, length = 255)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status;

    @Column(nullable = true)
    private String createdDate;

    @Column
    private String recipientEmail;

    @Column(nullable = true)
    private Long senderUserId;

    @Column(nullable = false)
    private boolean deleted = false;

    public Notification(Long userId, String title, String message, NotificationType type, NotificationStatus status,
                        String createdDate, String recipientEmail) {
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.status = status;
        this.createdDate = createdDate;
        this.recipientEmail = recipientEmail;
    }
}
