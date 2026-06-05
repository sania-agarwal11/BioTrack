package com.biotrack.iamservice.dto.request;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Used by authenticated users to change their own password.
 * Requires the current password for verification before accepting the new one.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequestDTO {
    private String currentPassword;
    private String newPassword;
}
