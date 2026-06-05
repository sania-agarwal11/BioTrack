package com.biotrack.analyticsservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.biotrack.analyticsservice.entity.KpiReport;
import com.biotrack.analyticsservice.enums.KpiTrackingType;
import java.util.List;

@Repository
public interface KpiReportRepository extends JpaRepository<KpiReport, Long> {

    // ✅ Custom finder: get reports by KPI type (scope)
    List<KpiReport> findByScope(KpiTrackingType scope);
}
