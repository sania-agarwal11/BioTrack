package com.biotrack.iamservice.repository;

import com.biotrack.iamservice.entity.User;
import com.biotrack.iamservice.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    List<User> findByRole(Role role);
}
