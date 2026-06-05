package com.biotrack.complianceservice.dto.response;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ComplianceReportResponseDTO {

    private Long   reportId;
    private String scope;
    private String generatedBy;
    private String generatedDate;
}
