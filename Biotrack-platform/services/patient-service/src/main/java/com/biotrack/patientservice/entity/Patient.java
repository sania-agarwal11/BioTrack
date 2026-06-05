package com.biotrack.patientservice.entity;

import jakarta.persistence.*;
import com.biotrack.patientservice.enums.EnrollmentStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "patients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long patientId;

    // ── New rich fields (added via ddl-auto:update) ───────────────────────────
    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = true)
    private String dateOfBirth;

    @Column(nullable = true)
    private String gender;

    @Column(nullable = true)
    private String contactNumber;

    @Column(nullable = true)
    private String email;

    @Column(nullable = true, length = 500)
    private String address;

    // ── Legacy columns — still NOT NULL in DB, kept to satisfy existing constraint ──
    // Populated automatically in the service from the new fields above.
    @Column(nullable = false)
    private String name;          // = firstName + " " + lastName

    @Column(nullable = false)
    private String dob;           // = dateOfBirth

    @Column(nullable = false, name = "contact_info")
    private String contactInfo;   // = contactNumber

    // ── Status & references ───────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EnrollmentStatus enrollmentStatus;

    @Column(nullable = true)
    private Long siteId;

    @Column(nullable = true)
    private Long protocolId;

    @Column(nullable = true)
    private String createdByName;

    @Column(nullable = true)
    private Long createdByUserId;

    @Column(nullable = false)
    private boolean deleted = false;

}
