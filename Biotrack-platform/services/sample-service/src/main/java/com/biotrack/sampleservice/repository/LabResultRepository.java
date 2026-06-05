package com.biotrack.sampleservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.sampleservice.entity.LabResult;
import java.util.List;
import java.util.Optional;

@Repository
public interface LabResultRepository extends JpaRepository<LabResult, Long> {
	Optional<LabResult> findBySample_SampleId(Long sampleId);
	List<LabResult> findByDeletedFalse();
	List<LabResult> findByDeletedTrue();
	Optional<LabResult> findByResultIdAndDeletedFalse(Long id);
}
