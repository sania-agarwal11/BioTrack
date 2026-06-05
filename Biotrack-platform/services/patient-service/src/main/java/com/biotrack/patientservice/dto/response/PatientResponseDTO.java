package com.biotrack.patientservice.dto.response;

import com.biotrack.patientservice.enums.EnrollmentStatus;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponseDTO {

    private Long patientId;
    private String firstName;
    private String lastName;
    private String dateOfBirth;
    private String gender;
    private String contactNumber;
    private String email;
    private String address;
    private EnrollmentStatus enrollmentStatus;
    private Long siteId;
    private Long protocolId;
    private String createdByName;
    private Long createdByUserId;
}
