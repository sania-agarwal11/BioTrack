package com.biotrack.iamservice.dto.response;

import com.biotrack.iamservice.enums.Role;
import com.biotrack.iamservice.enums.UserStatus;

public class UserResponseDTO {
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private Role role;
    private UserStatus status;

    public UserResponseDTO() {}

    public UserResponseDTO(Long userId, String name, String email,
                           String phone, Role role, UserStatus status) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.status = status;
    }

    // Getters and Setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }
}
