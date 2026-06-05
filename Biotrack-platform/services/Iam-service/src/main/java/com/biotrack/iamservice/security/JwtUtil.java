package com.biotrack.iamservice.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.List;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    /** Token lifetime in ms — read from application.yaml, defaults to 8 hours. */
    @Value("${jwt.expiration-ms:28800000}")
    private long expirationMs;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Authentication authentication) {
        List<String> authorities = authentication.getAuthorities()
                .stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        // Extract user details for audit tracking across services
        Long userId   = null;
        String userName = null;
        String userRole = null;
        if (authentication.getPrincipal() instanceof CustomUserDetails customUser) {
            userId   = customUser.getUser().getUserId();
            userName = customUser.getUser().getName();
            userRole = customUser.getUser().getRole() != null
                       ? customUser.getUser().getRole().name() : null;
        }

        var builder = Jwts.builder()
                .setSubject(authentication.getName())
                .claim("authorities", authorities)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs));

        if (userId   != null) builder.claim("userId",   userId);
        if (userName != null) builder.claim("userName", userName);
        if (userRole != null) builder.claim("userRole", userRole);

        return builder.signWith(getSigningKey(), SignatureAlgorithm.HS256).compact();
    }

    public Claims validateToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
