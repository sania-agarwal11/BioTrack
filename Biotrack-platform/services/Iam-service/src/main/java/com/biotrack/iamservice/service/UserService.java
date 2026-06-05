package com.biotrack.iamservice.service;

import com.biotrack.iamservice.dto.request.ChangePasswordRequestDTO;
import com.biotrack.iamservice.dto.request.ProfileUpdateRequestDTO;
import com.biotrack.iamservice.dto.request.UserRequestDTO;
import com.biotrack.iamservice.dto.response.UserProfileDTO;
import com.biotrack.iamservice.dto.response.UserResponseDTO;
import com.biotrack.iamservice.enums.Role;
import com.biotrack.iamservice.enums.UserStatus;
import com.biotrack.iamservice.exception.IdNotFoundException;

import java.util.List;

public interface UserService {

    // Basic CRUD
    UserResponseDTO addUser(UserRequestDTO requestDTO);
    List<UserResponseDTO> getAllUsers();
    UserResponseDTO getUserById(Long id) throws IdNotFoundException;
    UserProfileDTO getUserProfile(Long id) throws IdNotFoundException;
    UserResponseDTO updateUser(Long id, UserRequestDTO requestDTO) throws IdNotFoundException;
    String deleteUser(Long id) throws IdNotFoundException;

    // Extended operations (to match controller endpoints)
    UserResponseDTO updateUserRole(Long id, Role role) throws IdNotFoundException;
    UserResponseDTO updateUserStatus(Long id, UserStatus status) throws IdNotFoundException;
    String resetPassword(Long id, String newPassword) throws IdNotFoundException;
    String resetPasswordByEmail(String email, String newPassword);
    List<String> getUserPermissions(Long id) throws IdNotFoundException;

    // Approval workflow
    UserResponseDTO approveUser(Long id) throws IdNotFoundException;
    UserResponseDTO rejectUser(Long id) throws IdNotFoundException;

    // Self-service profile — any authenticated user can update their own name/phone
    UserResponseDTO updateMyProfile(Long id, ProfileUpdateRequestDTO dto) throws IdNotFoundException;

    // Self-service password change — verifies current password before accepting new one
    String changeMyPassword(Long id, ChangePasswordRequestDTO dto) throws IdNotFoundException;
}
