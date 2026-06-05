package com.biotrack.complianceservice.dto.response;

import com.biotrack.complianceservice.enums.ActionType;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponseDTO {

    private Long auditId;
    private Long userId;
    private String performedBy;
    private String userName;
    private String userRole;
    private ActionType action;
    private String resourceType;
    private String timestamp;
    private Long entityId;
}
