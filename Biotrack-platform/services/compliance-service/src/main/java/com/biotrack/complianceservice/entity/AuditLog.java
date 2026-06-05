package com.biotrack.complianceservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import com.biotrack.complianceservice.enums.ActionType;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long auditId;

    @Column(nullable = true)
    private Long userId;

    @Column(nullable = true, length = 255)
    private String performedBy;

    @Column(nullable = true, length = 255)
    private String userName;      // display name e.g. "Sania Agarwal"

    @Column(nullable = true, length = 100)
    private String userRole;      // e.g. "ADMIN"

    @Column(nullable = true, length = 100)
    private String resourceType;  // e.g. "PROTOCOL", "SITE", "AUTH"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionType action;

    @Column(name = "protocol_id")   // keep DB column name unchanged to avoid schema migration
    private Long entityId;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    public AuditLog(Long userId, ActionType action, LocalDateTime timestamp, Long entityId) {
        this.userId = userId;
        this.action = action;
        this.timestamp = timestamp;
        this.entityId = entityId;
    }

    public AuditLog(String performedBy, ActionType action, LocalDateTime timestamp, Long entityId) {
        this.performedBy = performedBy;
        this.action = action;
        this.timestamp = timestamp;
        this.entityId = entityId;
    }
}
