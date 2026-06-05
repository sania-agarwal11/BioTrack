package com.biotrack.patientservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.patientservice.entity.Visit;
import java.util.List;
import java.util.Optional;

@Repository
public interface VisitRepository extends JpaRepository<Visit, Long> {
	List<Visit> findByPatient_PatientId(Long patientId);
	List<Visit> findByDeletedFalse();
	List<Visit> findByDeletedTrue();
	Optional<Visit> findByVisitIdAndDeletedFalse(Long id);
	List<Visit> findByPatient_PatientIdAndDeletedFalse(Long patientId);
}
