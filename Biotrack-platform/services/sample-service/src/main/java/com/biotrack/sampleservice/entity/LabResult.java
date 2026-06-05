package com.biotrack.sampleservice.entity;

import com.biotrack.sampleservice.enums.LabResultStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "lab_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long resultId;

    @OneToOne
    @JoinColumn(name = "sample_id", nullable = false)
    private Sample sample;

    @Column(nullable = false)
    private String testType;        // DB column kept as-is

    @Column(nullable = false)
    private String resultValue;     // DB column kept as-is

    @Column(nullable = false)
    private LocalDate date;         // DB column kept as-is

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LabResultStatus status;

    // New fields (added via ddl-auto:update — all nullable)
    @Column(nullable = true, length = 50)
    private String unit;

    @Column(nullable = true, length = 100)
    private String referenceRange;

    @Column(nullable = true, length = 200)
    private String performedBy;

    @Column(nullable = true, length = 1000)
    private String reviewNotes;

    @Column(nullable = true, length = 1000)
    private String rejectionReason;

    @Column(nullable = false)
    private boolean deleted = false;
}
