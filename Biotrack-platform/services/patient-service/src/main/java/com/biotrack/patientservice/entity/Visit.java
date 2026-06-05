package com.biotrack.patientservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "visits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Visit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long visitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    // ✅ Store protocol reference as ID instead of string
    private Long protocolId;

    // ✅ Optional: store site reference as ID
    private Long siteId;

    @Column(nullable = true)
    private String visitType;

    @Column(nullable = false)
    private String visitDate;   // ⚡ Consider LocalDate if you want proper date handling

    @Column(nullable = false)
    private String status;      // renamed from visitStatus for consistency

    @Column(length = 1000)
    private String notes;

    @Column(nullable = true)
    private String createdByName;

    @Column(nullable = true)
    private Long createdByUserId;

    @Column(nullable = false)
    private boolean deleted = false;

    // ✅ Custom constructor for service calls (without visitId)
    public Visit(Patient patient, Long protocolId, Long siteId,
                 String visitType, String visitDate, String status, String notes) {
        this.patient = patient;
        this.protocolId = protocolId;
        this.siteId = siteId;
        this.visitType = visitType;
        this.visitDate = visitDate;
        this.status = status;
        this.notes = notes;
    }
}
