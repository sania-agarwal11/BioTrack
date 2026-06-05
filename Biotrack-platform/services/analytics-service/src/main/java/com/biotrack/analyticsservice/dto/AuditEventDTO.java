package com.biotrack.analyticsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AuditEventDTO {
    private Long   userId;
    private String performedBy;
    private String userName;
    private String userRole;
    private String action;        // "CREATE" / "UPDATE" / "DELETE"
    private String resourceType;  // "KPI_REPORT"
    private String timestamp;
    private Long   entityId;
}
