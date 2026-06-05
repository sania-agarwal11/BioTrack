package com.biotrack.sampleservice.entity;

import jakarta.persistence.*;
import com.biotrack.sampleservice.enums.SampleStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "samples")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Sample {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sampleId;

    @Column(nullable = false)
    private LocalDate collectedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SampleStatus status;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private Long siteId;

    @Column(nullable = false)
    private Long protocolId;

    // New rich fields (added via ddl-auto:update)
    @Column(nullable = true, length = 100)
    private String sampleType;

    @Column(nullable = true, length = 255)
    private String storageLocation;

    @Column(nullable = true, length = 1000)
    private String notes;

    @OneToOne(mappedBy = "sample", cascade = CascadeType.REMOVE, orphanRemoval = true)
    private LabResult labResult;

    @Column(nullable = false)
    private boolean deleted = false;
}
