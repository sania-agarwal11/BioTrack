package com.biotrack.notificationsservice.dto.response;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDTO {

    private Long notificationId;
    private Long userId;
    private Long senderUserId;
    private String title;
    private String message;
    private String type;
    private String status;
    private String createdDate;
    private String recipientEmail;
}
