package com.biotrack.analyticsservice.dto.response;

public class DashboardResponseDTO {

    // KPI store counts
    private long totalKpis;
    private long totalReports;

    // Patients
    private long totalPatients;
    private long enrolledPatients;
    private long completedPatients;
    private long withdrawnPatients;
    private long screeningPatients;

    // Protocols & Sites
    private long totalProtocols;
    private long activeProtocols;
    private long totalSites;
    private long activeSites;

    // Samples
    private long totalSamples;
    private long analyzedSamples;
    private long pendingSamples;

    // Lab Results
    private long totalLabResults;
    private long completedLabResults;
    private long pendingLabResults;
    private long rejectedLabResults;

    // Visits
    private long totalVisits;
    private long completedVisits;
    private long scheduledVisits;

    // Notifications
    private long totalNotifications;
    private long unreadNotifications;

    public DashboardResponseDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────────

    public long getTotalKpis()            { return totalKpis; }
    public void setTotalKpis(long v)      { totalKpis = v; }

    public long getTotalReports()         { return totalReports; }
    public void setTotalReports(long v)   { totalReports = v; }

    public long getTotalPatients()        { return totalPatients; }
    public void setTotalPatients(long v)  { totalPatients = v; }

    public long getEnrolledPatients()     { return enrolledPatients; }
    public void setEnrolledPatients(long v) { enrolledPatients = v; }

    public long getCompletedPatients()    { return completedPatients; }
    public void setCompletedPatients(long v) { completedPatients = v; }

    public long getWithdrawnPatients()    { return withdrawnPatients; }
    public void setWithdrawnPatients(long v) { withdrawnPatients = v; }

    public long getScreeningPatients()    { return screeningPatients; }
    public void setScreeningPatients(long v) { screeningPatients = v; }

    public long getTotalProtocols()       { return totalProtocols; }
    public void setTotalProtocols(long v) { totalProtocols = v; }

    public long getActiveProtocols()      { return activeProtocols; }
    public void setActiveProtocols(long v){ activeProtocols = v; }

    public long getTotalSites()           { return totalSites; }
    public void setTotalSites(long v)     { totalSites = v; }

    public long getActiveSites()          { return activeSites; }
    public void setActiveSites(long v)    { activeSites = v; }

    public long getTotalSamples()         { return totalSamples; }
    public void setTotalSamples(long v)   { totalSamples = v; }

    public long getAnalyzedSamples()      { return analyzedSamples; }
    public void setAnalyzedSamples(long v){ analyzedSamples = v; }

    public long getPendingSamples()       { return pendingSamples; }
    public void setPendingSamples(long v) { pendingSamples = v; }

    public long getTotalLabResults()      { return totalLabResults; }
    public void setTotalLabResults(long v){ totalLabResults = v; }

    public long getCompletedLabResults()  { return completedLabResults; }
    public void setCompletedLabResults(long v) { completedLabResults = v; }

    public long getPendingLabResults()    { return pendingLabResults; }
    public void setPendingLabResults(long v) { pendingLabResults = v; }

    public long getRejectedLabResults()   { return rejectedLabResults; }
    public void setRejectedLabResults(long v) { rejectedLabResults = v; }

    public long getTotalVisits()          { return totalVisits; }
    public void setTotalVisits(long v)    { totalVisits = v; }

    public long getCompletedVisits()      { return completedVisits; }
    public void setCompletedVisits(long v){ completedVisits = v; }

    public long getScheduledVisits()      { return scheduledVisits; }
    public void setScheduledVisits(long v){ scheduledVisits = v; }

    public long getTotalNotifications()   { return totalNotifications; }
    public void setTotalNotifications(long v) { totalNotifications = v; }

    public long getUnreadNotifications()  { return unreadNotifications; }
    public void setUnreadNotifications(long v) { unreadNotifications = v; }
}
