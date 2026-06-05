package com.biotrack.analyticsservice.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PatientSummaryDTO {
    private Long patientId;
    private String enrollmentStatus;
    private Long protocolId;
}
