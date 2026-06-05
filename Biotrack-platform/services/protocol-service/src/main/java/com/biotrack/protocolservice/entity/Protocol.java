package com.biotrack.protocolservice.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import com.biotrack.protocolservice.enums.ProtocolPhase;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "protocols")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Protocol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long protocolId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProtocolPhase phase;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private String status;

    /** Target number of patients to enroll in this protocol/study. */
    @Column(nullable = true)
    private Integer targetPatients;

    /** Name of the researcher who submitted this protocol request (null if created by admin/CTM). */
    @Column(nullable = true)
    private String submittedByName;

    /** User ID of the researcher who submitted this protocol request (used to send approval/rejection notifications). */
    @Column(nullable = true)
    private Long submittedByUserId;

    @Column(nullable = false)
    private boolean deleted = false;

    // ✅ Many-to-Many relationship with Site
    @ManyToMany
    @JoinTable(
            name = "protocol_site_mapping",
            joinColumns = @JoinColumn(name = "protocol_id"),
            inverseJoinColumns = @JoinColumn(name = "site_id")
    )
    private List<Site> sites = new ArrayList<>();

    public Protocol(String title, ProtocolPhase phase, LocalDate startDate, LocalDate endDate, String status) {
        this.title = title;
        this.phase = phase;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }
}
