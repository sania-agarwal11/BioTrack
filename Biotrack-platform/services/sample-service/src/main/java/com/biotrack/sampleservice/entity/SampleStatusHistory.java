package com.biotrack.sampleservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sample_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SampleStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long historyId;

    @Column(nullable = false)
    private Long sampleId;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(nullable = false)
    private LocalDateTime changedAt;

    @Column(length = 255)
    private String changedBy;

    @Column(length = 500)
    private String notes;
}
