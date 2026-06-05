package com.biotrack.complianceservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.complianceservice.entity.AuditLog;
import com.biotrack.complianceservice.enums.ActionType;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
	List<AuditLog> findByUserId(Long userId);
	List<AuditLog> findByAction(ActionType action);
	List<AuditLog> findByEntityId(Long entityId);
}
