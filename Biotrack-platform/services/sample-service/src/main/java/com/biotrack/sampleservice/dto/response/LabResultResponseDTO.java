package com.biotrack.sampleservice.dto.response;

import com.biotrack.sampleservice.enums.LabResultStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LabResultResponseDTO {

    private Long resultId;
    private Long sampleId;
    private String testName;
    private String result;
    private String unit;
    private String referenceRange;
    private LabResultStatus status;
    private String performedBy;
    private String performedDate;
    private String reviewNotes;
    private String rejectionReason;
}
