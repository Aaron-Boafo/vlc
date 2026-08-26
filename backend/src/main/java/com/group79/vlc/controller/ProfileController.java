package com.group79.vlc.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.group79.vlc.dto.UpdateProfileDTO;
import com.group79.vlc.dto.UserInfo;
import com.group79.vlc.response.RegisterResponse;
import com.group79.vlc.service.ProfileServices;

@RestController
@CrossOrigin
@RequestMapping("/profile")
public class ProfileController {
    private final ProfileServices profileService;

    public ProfileController(ProfileServices profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<RegisterResponse<UserInfo>> getProfile() {

        try {
            UserInfo profile = profileService.getProfile();
            return ResponseEntity.ok()
                    .body(new RegisterResponse<>(true, "User profile retrieved successfully", profile));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false, "Failed to retrieve user profile: " + e.getMessage(), null));
        }

    }

    @PostMapping("/update/username")
    public ResponseEntity<RegisterResponse<String>> updateProfileUsername(@RequestBody UpdateProfileDTO username) {
        try {
            // Call the service to update the profile
            String result = profileService.updateProfileName(username);

            if (result == null || "Error".equals(result)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegisterResponse<>(false, "Failed to update Profile", null));
            }

            return ResponseEntity.ok(new RegisterResponse<>(true, "Profile updated successfully", result));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false, "Failed to update Profile: " + e.getMessage(), null));
        }
    }

    @PostMapping("/update/image")
    public ResponseEntity<RegisterResponse<String>> updateProfile(
            @RequestPart MultipartFile profileImage) {
        try {
            // Call the service to update the profile
            String result = profileService.updateProfileImage(profileImage);

            if (result == null || "Error".equals(result)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new RegisterResponse<>(false, "Failed to update Profile", null));
            }

            return ResponseEntity.ok(new RegisterResponse<>(true, "Profile updated successfully", result));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false, "Failed to update Profile: " + e.getMessage(), null));
        }
    }

}
