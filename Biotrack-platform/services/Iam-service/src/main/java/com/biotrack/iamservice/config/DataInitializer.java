package com.biotrack.iamservice.config;

import com.biotrack.iamservice.entity.User;
import com.biotrack.iamservice.enums.Role;
import com.biotrack.iamservice.enums.UserStatus;
import com.biotrack.iamservice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

/**
 * Runs on every startup.
 * If no ADMIN account exists in the database, creates a default one
 * so the system is never left without a way to log in.
 *
 * Default credentials (change these immediately after logging in):
 *   Email   : admin@biotrack.com
 *   Password: Admin@2024
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Check if any ADMIN account exists
            boolean adminExists = userRepository.findAll()
                    .stream()
                    .anyMatch(u -> u.getRole() == Role.ADMIN && u.getStatus() == UserStatus.ACTIVE);

            if (!adminExists) {
                User admin = new User(
                        "Admin",
                        "admin@biotrack.com",
                        null,
                        Role.ADMIN,
                        UserStatus.ACTIVE,
                        passwordEncoder.encode("Admin@2024")
                );
                userRepository.save(admin);
                log.warn("╔══════════════════════════════════════════════════════════════╗");
                log.warn("║  NO ADMIN ACCOUNT FOUND — default admin created:            ║");
                log.warn("║  Email   : admin@biotrack.com                               ║");
                log.warn("║  Password: Admin@2024                                       ║");
                log.warn("║  CHANGE THE PASSWORD IMMEDIATELY after logging in!          ║");
                log.warn("╚══════════════════════════════════════════════════════════════╝");
            }
        };
    }
}
