package com.emobility.station.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Allow all requests (client cert is optional - handled at SSL level)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html").permitAll()
                .anyRequest().permitAll()
            )
            // Configure X.509 authentication (optional - only if client cert is provided)
            .x509(x509 -> x509
                .subjectPrincipalRegex("CN=(.*?)(?:,|$)")
                .userDetailsService(username -> {
                    // Simple user details service - in production, load from database
                    return org.springframework.security.core.userdetails.User
                        .withUsername(username)
                        .password("")
                        .authorities("ROLE_CLIENT")
                        .build();
                })
            )
            // Disable CSRF for REST APIs
            .csrf(csrf -> csrf.disable())
            // Allow all HTTP methods
            .headers(headers -> headers.frameOptions().disable());

        return http.build();
    }
}
