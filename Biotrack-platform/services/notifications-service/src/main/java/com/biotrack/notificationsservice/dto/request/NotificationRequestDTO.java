package com.biotrack.notificationsservice.dto.request;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequestDTO {

    private Long userId;
    private Long senderUserId;
    private String title;
    private String message;
    private String type;           // String → mapped to NotificationType enum
    private String status;         // String → mapped to NotificationStatus enum (defaults to UNREAD)
    private String createdDate;
    private String recipientEmail; // Required when type = EMAIL
}
