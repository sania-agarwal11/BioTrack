package com.biotrack.protocolservice.dto.request;

import com.biotrack.protocolservice.enums.SiteStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SiteRequestDTO {

    private String name;
    private String location;
    private String investigatorId;
    private SiteStatus status;

    /** Set by the frontend when a RESEARCH_SCIENTIST submits a new site request. */
    private String submittedByName;

    /** User ID of the researcher — used to deliver approval/rejection notifications. */
    private Long submittedByUserId;
}
