package com.biotrack.analyticsservice.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ProtocolSummaryDTO {
    private Long protocolId;
    private String title;
    private String phase;
    private String startDate;
    private String endDate;
    private String status;
    private Integer targetPatients;
    private java.util.List<String> sites;
}
