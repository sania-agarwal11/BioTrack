package com.biotrack.complianceservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "compliance_reports")
@Getter
@Setter
@NoArgsConstructor
public class ComplianceReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long reportId;

    @Column(nullable = false)
    private String scope;

    @Column(nullable = true, length = 1000)
    private String generatedBy;

    @Column(nullable = false)
    private LocalDate generatedDate;

    public ComplianceReport(String scope, String generatedBy, LocalDate generatedDate) {
        this.scope = scope;
        this.generatedBy = generatedBy;
        this.generatedDate = generatedDate;
    }
}
