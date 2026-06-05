package com.biotrack.analyticsservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import com.biotrack.analyticsservice.enums.KpiTrackingType;

@Entity
@Table(name = "kpi_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KpiReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reportId;

    @Column(nullable = true)
    private String reportName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KpiTrackingType scope;

    @Column(nullable = true)
    private String metricName;

    @Column(nullable = true)
    private String metricValue;

    @Column(nullable = true)
    private String unit;

    // Legacy column — kept nullable so existing rows are not broken
    @Column(nullable = true, length = 2000)
    private String metrics;

    @Column(nullable = false)
    private LocalDate generatedDate;
}
