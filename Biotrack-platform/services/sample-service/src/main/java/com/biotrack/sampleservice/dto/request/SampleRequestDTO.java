package com.biotrack.sampleservice.dto.request;

import com.biotrack.sampleservice.enums.SampleStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SampleRequestDTO {

    private Long patientId;
    private Long protocolId;
    private Long siteId;
    private String sampleType;
    private String collectionDate;
    private String storageLocation;
    private SampleStatus status;
    private String notes;
}
