package com.biotrack.sampleservice.dto.request;

import com.biotrack.sampleservice.enums.LabResultStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LabResultRequestDTO {

    private Long sampleId;
    private String testName;        // frontend field name
    private String result;          // frontend field name
    private String unit;
    private String referenceRange;
    private LabResultStatus status;
    private String performedBy;
    private String performedDate;   // frontend field name (yyyy-MM-dd)
    private String reviewNotes;      // only populated when status = REVIEWED
    private String rejectionReason;  // only populated when status = REJECTED
}
