package com.biotrack.sampleservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.sampleservice.entity.Sample;
import java.util.List;
import java.util.Optional;

@Repository
public interface SampleRepository extends JpaRepository<Sample, Long> {

	// ✅ Active-only queries
	List<Sample> findByDeletedFalse();
	List<Sample> findByDeletedTrue();
	Optional<Sample> findBySampleIdAndDeletedFalse(Long id);

	// ✅ Get samples by protocol (active only)
	List<Sample> findByProtocolIdAndDeletedFalse(Long protocolId);

	// ✅ Get samples by patient (active only)
	List<Sample> findByPatientIdAndDeletedFalse(Long patientId);

	// Keep originals for backward compat
	List<Sample> findByProtocolId(Long protocolId);
	List<Sample> findByPatientId(Long patientId);
}
