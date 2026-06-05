package com.biotrack.patientservice.dto.request;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VisitRequestDTO {

    private Long patientId;

    // ✅ Reference protocol and site by ID instead of string
    private Long protocolId;
    private Long siteId;

    private String visitType;
    private String visitDate;   // ⚡ Consider LocalDate for proper date handling
    private String status;      // renamed from visitStatus for consistency
    private String notes;
    private String createdByName;
    private Long createdByUserId;
}
