package com.biotrack.protocolservice.dto.response;

import com.biotrack.protocolservice.enums.ProtocolPhase;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProtocolResponseDTO {

    private Long protocolId;
    private String title;
    private ProtocolPhase phase;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private Integer targetPatients;

    /** Researcher who submitted this protocol for approval (null for admin/CTM-created protocols). */
    private String submittedByName;

    /** User ID of the submitting researcher — used to deliver approval/rejection notifications. */
    private Long submittedByUserId;

    // Include linked sites (IDs or names)
    private List<String> sites;
}
