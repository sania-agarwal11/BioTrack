package com.biotrack.patientservice.enums;

public enum EnrollmentStatus {
    SCREENING,    // Consent-related evaluation phase
    ENROLLED,     // Officially enrolled in the trial
    ANALYZING,    // Active tracking / data collection phase
    COMPLETED,    // Trial participation complete
    WITHDRAWN,    // Consent revoked
    CANCELLED     // Patient deemed ineligible
}
