package com.biotrack.complianceservice.dto.request;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceReportRequestDTO {

    private String scope;
    private String generatedBy;
    private String generatedDate;   // e.g. "2026-05-07"
}
