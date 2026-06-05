package com.biotrack.sampleservice.dto.response;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SampleStatusHistoryResponseDTO {

    private Long historyId;
    private Long sampleId;
    private String status;
    private String changedAt;
    private String changedBy;
    private String notes;
}
