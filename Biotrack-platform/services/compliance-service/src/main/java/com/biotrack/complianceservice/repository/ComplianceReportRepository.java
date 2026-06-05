package com.biotrack.complianceservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.complianceservice.entity.ComplianceReport;

@Repository
public interface ComplianceReportRepository extends JpaRepository<ComplianceReport, Long> {
    // ✅ Additional query methods can be added later if needed
}
