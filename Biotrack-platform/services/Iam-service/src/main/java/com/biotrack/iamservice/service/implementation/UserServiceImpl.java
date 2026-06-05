package com.biotrack.iamservice.service.implementation;

import com.biotrack.iamservice.dto.request.ChangePasswordRequestDTO;
import com.biotrack.iamservice.dto.request.ProfileUpdateRequestDTO;
import com.biotrack.iamservice.dto.request.UserRequestDTO;
import com.biotrack.iamservice.dto.response.UserProfileDTO;
import com.biotrack.iamservice.dto.response.UserResponseDTO;
import com.biotrack.iamservice.entity.User;
import com.biotrack.iamservice.enums.Role;
import com.biotrack.iamservice.enums.UserStatus;
import com.biotrack.iamservice.exception.IdNotFoundException;
import com.biotrack.iamservice.repository.UserRepository;
import com.biotrack.iamservice.service.RegistrationEmailService;
import com.biotrack.iamservice.service.UserService;
import com.biotrack.iamservice.util.DtoMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationEmailService registrationEmailService;

    @Autowired
    public UserServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           RegistrationEmailService registrationEmailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.registrationEmailService = registrationEmailService;
    }

    @Override
    public UserResponseDTO addUser(UserRequestDTO requestDTO) {
        if (userRepository.existsByEmailIgnoreCase(requestDTO.getEmail())) {
            throw new IllegalArgumentException("An account with this email address already exists. Please use a different email or sign in.");
        }
        UserStatus status = requestDTO.getStatus() != null ? requestDTO.getStatus() : UserStatus.ACTIVE;
        User user = new User(
                requestDTO.getName(),
                requestDTO.getEmail(),
                requestDTO.getPhone(),
                requestDTO.getRole(),
                status,
                passwordEncoder.encode(requestDTO.getPassword())
        );
        User saved = userRepository.save(user);
        return DtoMapper.toUserResponseDTO(saved);
    }

    @Override
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(DtoMapper::toUserResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponseDTO getUserById(Long id) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        return DtoMapper.toUserResponseDTO(user);
    }

    @Override
    public UserProfileDTO getUserProfile(Long id) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        // Format role nicely e.g. LAB_TECHNICIAN -> Lab Technician
        String roleLabel = user.getRole() != null
                ? user.getRole().name().replace("_", " ")
                        .substring(0, 1).toUpperCase()
                        + user.getRole().name().replace("_", " ").substring(1).toLowerCase()
                : null;
        return new UserProfileDTO(user.getUserId(), user.getName(), roleLabel);
    }

    @Override
    public UserResponseDTO updateUser(Long id, UserRequestDTO requestDTO) throws IdNotFoundException {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));

        existing.setName(requestDTO.getName());
        existing.setEmail(requestDTO.getEmail());
        existing.setPhone(requestDTO.getPhone());
        existing.setRole(requestDTO.getRole());

        if (requestDTO.getStatus() != null) {
            existing.setStatus(requestDTO.getStatus());
        }

        if (requestDTO.getPassword() != null && !requestDTO.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(requestDTO.getPassword()));
        }

        User updated = userRepository.save(existing);
        return DtoMapper.toUserResponseDTO(updated);
    }

    @Override
    @Transactional
    public String deleteUser(Long id) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        userRepository.delete(user);
        userRepository.flush(); // force the SQL immediately so FK errors surface here, not later
        return "User deleted successfully with ID: " + id;
    }

    @Override
    public UserResponseDTO updateUserRole(Long id, Role role) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        user.setRole(role);
        User updated = userRepository.save(user);
        return DtoMapper.toUserResponseDTO(updated);
    }

    @Override
    public UserResponseDTO updateUserStatus(Long id, UserStatus status) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        user.setStatus(status);
        User updated = userRepository.save(user);
        return DtoMapper.toUserResponseDTO(updated);
    }

    @Override
    public String resetPassword(Long id, String newPassword) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return "Password reset successfully for user ID: " + id;
    }

    @Override
    public String resetPasswordByEmail(String email, String newPassword) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return "Password reset successfully for: " + email;
    }

    @Override
    public List<String> getUserPermissions(Long id) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        return Collections.singletonList("ROLE_" + user.getRole());
    }

    @Override
    public UserResponseDTO approveUser(Long id) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepository.save(user);
        // Notify the user their account is approved
        registrationEmailService.sendApprovalEmail(saved.getEmail(), saved.getName());
        return DtoMapper.toUserResponseDTO(saved);
    }

    @Override
    public UserResponseDTO updateMyProfile(Long id, ProfileUpdateRequestDTO dto) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone().trim());
        }
        // Email update — only allowed for ADMIN role
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            if (user.getRole() != Role.ADMIN) {
                throw new IllegalArgumentException("Only Administrators can change their email address.");
            }
            String newEmail = dto.getEmail().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail()) && userRepository.existsByEmailIgnoreCase(newEmail)) {
                throw new IllegalArgumentException("An account with this email address already exists.");
            }
            user.setEmail(newEmail);
        }

        User updated = userRepository.save(user);
        return DtoMapper.toUserResponseDTO(updated);
    }

    @Override
    public String changeMyPassword(Long id, ChangePasswordRequestDTO dto) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        if (dto.getNewPassword() == null || dto.getNewPassword().length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters.");
        }
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);
        return "Password changed successfully.";
    }

    @Override
    public UserResponseDTO rejectUser(Long id) throws IdNotFoundException {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IdNotFoundException("User not found with ID: " + id));
        user.setStatus(UserStatus.REJECTED);
        User saved = userRepository.save(user);
        // Notify the user their account was rejected
        registrationEmailService.sendRejectionEmail(saved.getEmail(), saved.getName());
        return DtoMapper.toUserResponseDTO(saved);
    }
}
