package com.biotrack.iamservice.dto.request;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Used by authenticated users to update their own profile.
 * - name + phone: editable by all roles
 * - email: editable only when the caller is ADMIN (enforced in the service)
 * Role is intentionally excluded — requires a separate admin operation.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateRequestDTO {
    private String name;
    private String phone;
    private String email;   // null = no change; only honoured for ADMIN callers
}
