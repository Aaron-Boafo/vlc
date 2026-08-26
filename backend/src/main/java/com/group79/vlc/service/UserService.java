package com.group79.vlc.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.group79.vlc.dto.LoginDTO;
import com.group79.vlc.model.Profile;
import com.group79.vlc.model.Users;
import com.group79.vlc.repo.ProfileRepo;
import com.group79.vlc.repo.UserRepo;

@Service
public class UserService {

    private final JWTService jwtService;
    private final AuthenticationManager authManager;
    private final UserRepo repo;
    private final ProfileRepo profile;
    private final BCryptPasswordEncoder encoder;

    public UserService(JWTService jwtService, AuthenticationManager authManager, UserRepo repo, ProfileRepo profile) {
        this.jwtService = jwtService;
        this.authManager = authManager;
        this.repo = repo;
        this.profile = profile;
        this.encoder = new BCryptPasswordEncoder(12);
    }

    @Transactional
    public Users register(LoginDTO user) {
        // generate an id for each user
        String uuid = UUID.randomUUID().toString();
        LocalDateTime currentTime = java.time.LocalDateTime.now();

        // create an instance of a new user
        Users DBuser = new Users();

        DBuser.setPhoneNumber(user.getPhoneNumber());
        DBuser.setPassword(encoder.encode(user.getPassword())); // encrypt the password
        DBuser.setId(uuid);
        DBuser.setCreatedAt(currentTime); // set the creation time

        // save the user
        repo.save(DBuser);

        // create a profile for the new user
        profile.save(new Profile(UUID.randomUUID().toString(), uuid, user.getPhoneNumber(), 0.00, null));

        // return the user after all is saved
        return DBuser;
    }

    public String verify(LoginDTO user) {
        Authentication authentication = authManager
                .authenticate(new UsernamePasswordAuthenticationToken(user.getPhoneNumber(), user.getPassword()));
        if (authentication.isAuthenticated()) {
            return jwtService.generateToken(user.getPhoneNumber()); // Generate JWT token for the user
        } else {
            return "fail";
        }

    }

    public boolean existsByPhoneNumber(String phoneNumber) {
        return repo.findByPhoneNumber(phoneNumber) != null;
    }

    @Transactional
    public String resetPassword(LoginDTO user) {
        // Find the user by phone number
        Users dbUser = repo.findByPhoneNumber(user.getPhoneNumber());
        if (dbUser == null) {
            throw new IllegalArgumentException("User not found");
        }

        // turn the password into a hash
        String hashedPassword = encoder.encode(user.getPassword());

        // Update the user's password and updatedAt timestamp
        dbUser.setPassword(hashedPassword);
        dbUser.setUpdatedAt(LocalDateTime.now());

        repo.save(dbUser);

        // Return success message
        return "success";
    }

    public String getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null; // Or throw an exception if unauthenticated access is not allowed
        }
        String phoneNumber = authentication.getName();

        // get the user by phone number
        Users user = repo.findByPhoneNumber(phoneNumber);

        if (user == null) {
            // This case should ideally not happen if authentication is successful
            // but good to handle defensively.
            throw new IllegalStateException("Authenticated user not found in database.");
        }

        // return the user id for all searches
        return user.getId();
    }

    public Users getUserById() {
        String userId = getCurrentUser();
        if (userId == null) {
            return null; // User not authenticated or current user ID not found
        }

        Users user = repo.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found for ID: " + userId));

        if (user == null) {
            // This case should ideally not happen if getCurrentUser returns a valid ID
            throw new IllegalStateException("User not found for ID: " + userId);
        }

        return user;
    }
}
