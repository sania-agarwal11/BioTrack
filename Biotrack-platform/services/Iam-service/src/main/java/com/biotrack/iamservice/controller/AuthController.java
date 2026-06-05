package com.biotrack.iamservice.controller;

import com.biotrack.iamservice.dto.request.ForgotPasswordRequest;
import com.biotrack.iamservice.dto.request.LoginRequest;
import com.biotrack.iamservice.dto.request.ResetPasswordRequest;
import com.biotrack.iamservice.dto.request.UserRequestDTO;
import com.biotrack.iamservice.dto.request.VerifyOtpRequest;
import com.biotrack.iamservice.dto.response.TokenResponse;
import com.biotrack.iamservice.dto.response.UserResponseDTO;
import com.biotrack.iamservice.enums.UserStatus;
import com.biotrack.iamservice.entity.User;
import com.biotrack.iamservice.repository.UserRepository;
import com.biotrack.iamservice.security.CustomUserDetails;
import com.biotrack.iamservice.security.JwtUtil;
import com.biotrack.iamservice.service.AuditLogClient;
import com.biotrack.iamservice.service.NotificationClient;
import com.biotrack.iamservice.service.OtpService;
import com.biotrack.iamservice.service.RegistrationEmailService;
import com.biotrack.iamservice.service.UserService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final UserService userService;
    private final OtpService otpService;
    private final AuditLogClient auditLogClient;
    private final RegistrationEmailService registrationEmailService;
    private final NotificationClient notificationClient;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtUtil jwtUtil,
                          UserRepository userRepository,
                          UserService userService,
                          OtpService otpService,
                          AuditLogClient auditLogClient,
                          RegistrationEmailService registrationEmailService,
                          NotificationClient notificationClient) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.userService = userService;
        this.otpService = otpService;
        this.auditLogClient = auditLogClient;
        this.registrationEmailService = registrationEmailService;
        this.notificationClient = notificationClient;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody UserRequestDTO requestDTO) {
        // Self-registration always starts as PENDING_APPROVAL — admin must approve
        requestDTO.setStatus(UserStatus.PENDING_APPROVAL);
        UserResponseDTO saved = userService.addUser(requestDTO);
        // Notify admin by email (fire-and-forget)
        try { registrationEmailService.sendAdminApprovalRequest(saved); } catch (Exception ignored) {}
        // Post notification to admin's notification panel (fire-and-forget)
        notificationClient.sendRegistrationNotification(saved.getName(), saved.getEmail());
        return ResponseEntity.ok(Map.of(
            "message", "Registration submitted! An administrator will review your request. You will receive an email once your account is approved."
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password. Please try again."));
        } catch (LockedException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Your account is pending approval or has been deactivated. Contact your administrator."));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Your account is not active. Contact your administrator."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication failed: " + e.getMessage()));
        }

        String token = jwtUtil.generateToken(authentication);

        // Fire-and-forget: record LOGIN in audit trail
        try {
            Long   userId   = null;
            String userName = null;
            String userRole = null;
            if (authentication.getPrincipal() instanceof CustomUserDetails customUser) {
                userId   = customUser.getUser().getUserId();
                userName = customUser.getUser().getName();
                userRole = customUser.getUser().getRole() != null
                           ? customUser.getUser().getRole().name() : null;
            }
            auditLogClient.logEvent(userId, authentication.getName(), userName, userRole,
                    "LOGIN", "AUTH", token);
        } catch (Exception ignored) {}

        return ResponseEntity.ok(new TokenResponse(token));
    }

    @PostMapping("/logout")
    public String logout(HttpServletRequest request) {
        // Fire-and-forget: record LOGOUT in audit trail
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token  = authHeader.substring(7);
                Claims claims = jwtUtil.validateToken(token);
                Long   userId   = claims.get("userId",   Long.class);
                String userName = claims.get("userName", String.class);
                String userRole = claims.get("userRole", String.class);
                String email    = claims.getSubject();
                auditLogClient.logEvent(userId, email, userName, userRole,
                        "LOGOUT", "AUTH", token);
            }
        } catch (Exception ignored) {}
        return "Logged out";
    }

    @GetMapping("/me")
    public UserResponseDTO me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth != null ? auth.getName() : null;
        if (email == null) return null;

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return null;

        return new UserResponseDTO(
                user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getStatus()
        );
    }

    @GetMapping("/validate")
    public String validate() {
        return "VALID";
    }

    // ── Forgot Password — Step 1: Send OTP ────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail();
        User user = userRepository.findByEmail(email.toLowerCase()).orElse(null);
        if (user == null) {
            // Vague message — avoids email enumeration
            return ResponseEntity.ok(Map.of("message",
                    "If an account exists for that email, an OTP has been sent."));
        }
        try {
            otpService.sendOtp(user.getEmail(), user.getName());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message",
                    "Failed to send OTP email. Please check your internet connection or try again later. ("
                    + e.getMessage() + ")"));
        }
        return ResponseEntity.ok(Map.of("message",
                "OTP sent to " + maskEmail(email) + ". Check your inbox — valid for 10 minutes."));
    }

    // ── Forgot Password — Step 2: Verify OTP (non-consuming peek) ────────────

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody VerifyOtpRequest request) {
        // peekOtp validates without consuming — OTP remains available for step 3
        boolean valid = otpService.peekOtp(request.getEmail(), request.getOtp());
        if (valid) {
            return ResponseEntity.ok(Map.of("valid", true, "message", "OTP verified successfully."));
        } else {
            return ResponseEntity.badRequest()
                    .body(Map.of("valid", false, "message", "Invalid or expired OTP."));
        }
    }

    // ── Forgot Password — Step 3: Reset Password (consuming verify) ───────────

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPasswordWithOtp(@RequestBody ResetPasswordRequest request) {
        // verifyOtp consumes the OTP (one-time use enforced here)
        boolean valid = otpService.verifyOtp(request.getEmail(), request.getOtp());
        if (!valid) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid or expired OTP. Please request a new one."));
        }
        userService.resetPasswordByEmail(request.getEmail(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message",
                "Password reset successfully. You can now sign in with your new password."));
    }

    // ── Helper ─────────────────────────────────────────────────────────────────

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 2) return email;
        return email.substring(0, 2) + "***" + email.substring(at);
    }
}
