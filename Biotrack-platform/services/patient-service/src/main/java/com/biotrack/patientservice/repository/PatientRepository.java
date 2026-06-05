package com.biotrack.patientservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.patientservice.entity.Patient;
import java.util.List;
import java.util.Optional;
import com.biotrack.patientservice.enums.EnrollmentStatus;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

	// ── Active patients only ──────────────────────────────────────────────────
	List<Patient> findByDeletedFalse();
	Optional<Patient> findByPatientIdAndDeletedFalse(Long patientId);

	List<Patient> findBySiteIdAndDeletedFalse(Long siteId);
	List<Patient> findByEnrollmentStatusAndDeletedFalse(EnrollmentStatus status);
	List<Patient> findByProtocolIdAndDeletedFalse(Long protocolId);

	// ── Soft-deleted patients ─────────────────────────────────────────────────
	List<Patient> findByDeletedTrue();
}
