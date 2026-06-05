package com.biotrack.analyticsservice.dto.response;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class KpiReportResponseDTO {

    private Long   reportId;
    private String reportName;
    private String scope;
    private String metricName;
    private String metricValue;
    private String unit;
    private String generatedDate;
}
