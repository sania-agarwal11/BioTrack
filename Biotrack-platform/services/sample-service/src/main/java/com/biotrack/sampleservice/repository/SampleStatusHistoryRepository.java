package com.biotrack.sampleservice.repository;

import com.biotrack.sampleservice.entity.SampleStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SampleStatusHistoryRepository extends JpaRepository<SampleStatusHistory, Long> {
    List<SampleStatusHistory> findBySampleIdOrderByChangedAtAsc(Long sampleId);
}
