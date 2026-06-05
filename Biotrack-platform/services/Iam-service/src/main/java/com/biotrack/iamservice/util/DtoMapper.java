package com.biotrack.iamservice.util;

import com.biotrack.iamservice.dto.response.UserResponseDTO;
import com.biotrack.iamservice.entity.User;

public class DtoMapper {

    public static UserResponseDTO toUserResponseDTO(User user) {
        return new UserResponseDTO(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus()
        );
    }
}
