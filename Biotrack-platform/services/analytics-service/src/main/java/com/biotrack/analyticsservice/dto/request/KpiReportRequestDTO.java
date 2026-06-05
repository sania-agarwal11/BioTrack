package com.biotrack.analyticsservice.dto.request;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KpiReportRequestDTO {

    private String reportName;      // e.g. "Q1 Patient Enrollment"
    private String scope;           // e.g. "GLOBAL", "PROTOCOL", "SITE", "PATIENT", "SAMPLE"
    private String metricName;      // e.g. "Enrollment Rate"
    private String metricValue;     // e.g. "87.5"
    private String unit;            // e.g. "%"
    private String generatedDate;   // e.g. "2026-05-07"
}
