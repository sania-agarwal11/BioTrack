package com.biotrack.notificationsservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.biotrack.notificationsservice.entity.Notification;
import com.biotrack.notificationsservice.enums.NotificationStatus;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

	// ✅ Find all notifications for a given user
	List<Notification> findByUserId(Long userId);

	// ✅ Find notifications for a user filtered by status
	List<Notification> findByUserIdAndStatus(Long userId, NotificationStatus status);

	// ✅ Count notifications for a user filtered by status (useful for dashboard/summary)
	long countByUserIdAndStatus(Long userId, NotificationStatus status);

	// Find notifications addressed to a specific user OR broadcast (userId IS NULL)
	@Query("SELECT n FROM Notification n WHERE n.userId = :userId OR n.userId IS NULL ORDER BY n.notificationId DESC")
	List<Notification> findByUserIdOrBroadcast(@Param("userId") Long userId);

	// Find all notifications a user is INVOLVED in:
	//   • received (userId = X)
	//   • broadcasts (userId IS NULL)
	//   • sent by the user (senderUserId = X)
	// Excludes soft-deleted entries so the normal inbox/outbox view stays clean.
	@Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR n.userId IS NULL OR n.senderUserId = :userId) AND n.deleted = false ORDER BY n.notificationId DESC")
	List<Notification> findAllByUserInvolvement(@Param("userId") Long userId);

	// Find broadcast+targeted notifications for a user filtered by status
	@Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR n.userId IS NULL) AND n.status = :status")
	List<Notification> findByUserIdOrBroadcastAndStatus(@Param("userId") Long userId, @Param("status") NotificationStatus status);

	// Count unread for a user including broadcasts
	@Query("SELECT COUNT(n) FROM Notification n WHERE (n.userId = :userId OR n.userId IS NULL) AND n.status = :status")
	long countByUserIdOrBroadcastAndStatus(@Param("userId") Long userId, @Param("status") NotificationStatus status);

	List<Notification> findByDeletedFalse();
	List<Notification> findByDeletedTrue();

	// Override existing queries to filter deleted=false
	List<Notification> findByUserIdAndDeletedFalse(Long userId);

	// Deleted notifications for a specific user (received, broadcasts, or sent by them)
	@Query("SELECT n FROM Notification n WHERE (n.userId = :userId OR n.userId IS NULL OR n.senderUserId = :userId) AND n.deleted = true ORDER BY n.notificationId DESC")
	List<Notification> findDeletedByUserInvolvement(@Param("userId") Long userId);
}
