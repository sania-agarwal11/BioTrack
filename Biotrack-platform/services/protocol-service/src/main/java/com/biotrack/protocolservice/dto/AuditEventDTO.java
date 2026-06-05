package com.biotrack.protocolservice.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditEventDTO {
    private Long   userId;        // numeric user ID from JWT claim
    private String performedBy;   // email (JWT subject)
    private String userName;      // display name (e.g. "Sania Agarwal")
    private String userRole;      // role  (e.g. "ADMIN")
    private String action;
    private String resourceType;  // e.g. "PROTOCOL", "SITE", "AUTH"
    private String timestamp;
    private Long   entityId;      // generic entity ID (protocol ID, site ID, etc.)
}
