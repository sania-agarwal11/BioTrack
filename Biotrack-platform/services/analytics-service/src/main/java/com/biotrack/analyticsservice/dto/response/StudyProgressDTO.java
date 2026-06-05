package com.biotrack.analyticsservice.dto.response;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudyProgressDTO {

    private Long protocolId;
    private String title;
    private String phase;
    private String status;
    private String startDate;
    private String endDate;

    /** Target total patients set for this protocol. Null if not configured. */
    private Integer targetPatients;

    /** Total patients linked to this protocol (any enrollment status). */
    private long totalPatients;

    /** Patients with ENROLLED status. */
    private long enrolledPatients;

    /** Enrollment % = enrolledPatients / targetPatients × 100 (0 if targetPatients is null/0). */
    private double enrollmentPercentage;

    /** Number of sites linked to this protocol. */
    private long siteCount;

    /** Total visits for this protocol. */
    private long totalVisits;

    /** Completed visits. */
    private long completedVisits;

    /** Scheduled (upcoming) visits. */
    private long scheduledVisits;

    /** Missed visits. */
    private long missedVisits;

    /** Human-readable status: "On Track", "Behind Target", "Completed", "Overdue" */
    private String progressStatus;
}
