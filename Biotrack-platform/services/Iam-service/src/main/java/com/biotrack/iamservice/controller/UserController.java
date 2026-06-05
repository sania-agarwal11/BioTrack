package com.biotrack.iamservice.controller;

import com.biotrack.iamservice.dto.request.ChangePasswordRequestDTO;
import com.biotrack.iamservice.dto.request.ProfileUpdateRequestDTO;
import com.biotrack.iamservice.dto.request.UserRequestDTO;
import com.biotrack.iamservice.dto.response.UserProfileDTO;
import com.biotrack.iamservice.dto.response.UserResponseDTO;
import com.biotrack.iamservice.enums.Role;
import com.biotrack.iamservice.enums.UserStatus;
import com.biotrack.iamservice.exception.IdNotFoundException;
import com.biotrack.iamservice.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> createUser(@RequestBody UserRequestDTO requestDTO) {
        return new ResponseEntity<>(userService.addUser(requestDTO), HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponseDTO>> getAllUsers() {
        return new ResponseEntity<>(userService.getAllUsers(), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> getUserById(@PathVariable Long id) throws IdNotFoundException {
        return new ResponseEntity<>(userService.getUserById(id), HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> updateUser(@PathVariable Long id,
                                                      @RequestBody UserRequestDTO requestDTO) throws IdNotFoundException {
        return new ResponseEntity<>(userService.updateUser(id, requestDTO), HttpStatus.OK);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> updateUserRole(@PathVariable Long id,
                                                          @RequestParam Role role) throws IdNotFoundException {
        return new ResponseEntity<>(userService.updateUserRole(id, role), HttpStatus.OK);
    }

    // Public profile — name + role only, accessible to ALL authenticated users
    @GetMapping("/{id}/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserProfileDTO> getUserProfile(@PathVariable Long id) throws IdNotFoundException {
        return new ResponseEntity<>(userService.getUserProfile(id), HttpStatus.OK);
    }

    // Self-service: any authenticated user can update their own name + phone
    @PatchMapping("/{id}/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserResponseDTO> updateMyProfile(@PathVariable Long id,
                                                           @RequestBody ProfileUpdateRequestDTO dto) throws IdNotFoundException {
        return new ResponseEntity<>(userService.updateMyProfile(id, dto), HttpStatus.OK);
    }

    // Self-service: change own password (requires current password verification)
    @PostMapping("/{id}/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<String> changeMyPassword(@PathVariable Long id,
                                                   @RequestBody ChangePasswordRequestDTO dto) throws IdNotFoundException {
        return new ResponseEntity<>(userService.changeMyPassword(id, dto), HttpStatus.OK);
    }

    @GetMapping("/{id}/permissions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<String>> getUserPermissions(@PathVariable Long id) throws IdNotFoundException {
        return new ResponseEntity<>(userService.getUserPermissions(id), HttpStatus.OK);
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> resetPassword(@PathVariable Long id,
                                                @RequestParam String newPassword) throws IdNotFoundException {
        return new ResponseEntity<>(userService.resetPassword(id, newPassword), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) throws IdNotFoundException {
        return new ResponseEntity<>(userService.deleteUser(id), HttpStatus.OK);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> updateUserStatus(@PathVariable Long id,
                                                            @RequestParam UserStatus status) throws IdNotFoundException {
        return new ResponseEntity<>(userService.updateUserStatus(id, status), HttpStatus.OK);
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> assignRole(@PathVariable Long id,
                                                      @RequestParam Role role) throws IdNotFoundException {
        return new ResponseEntity<>(userService.updateUserRole(id, role), HttpStatus.OK);
    }

    @GetMapping("/roles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Role>> getRoles() {
        return new ResponseEntity<>(Arrays.asList(Role.values()), HttpStatus.OK);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> approveUser(@PathVariable Long id) throws IdNotFoundException {
        return new ResponseEntity<>(userService.approveUser(id), HttpStatus.OK);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDTO> rejectUser(@PathVariable Long id) throws IdNotFoundException {
        return new ResponseEntity<>(userService.rejectUser(id), HttpStatus.OK);
    }
}
