package com.group79.vlc.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.group79.vlc.dto.UpdateProfileDTO;
import com.group79.vlc.dto.UserInfo;
import com.group79.vlc.model.Profile;
import com.group79.vlc.model.Users;
import com.group79.vlc.repo.ProfileRepo;

@Service
public class ProfileServices {

    private final ProfileRepo repo;
    private final UserService userService;
    private final CloudinaryService cloud;

    public ProfileServices(ProfileRepo repo, UserService userService, CloudinaryService cloud) {
        this.repo = repo;
        this.userService = userService;
        this.cloud = cloud;
    }

    public UserInfo getProfile() {
        // Get the current user's ID from authentication context
        String userId = userService.getCurrentUser();

        if (userId == null) {
            throw new IllegalStateException("User not authenticated.");
        }

        // Fetch user and profile by userId
        Users user = userService.getUserById();
        Profile profile = repo.findByUserId(userId);

        if (user == null) {
            throw new IllegalStateException("User not found for authenticated ID.");
        }

        if (profile == null) {
            throw new IllegalStateException("Profile not found for user ID.");
        }

        // Build UserInfo
        UserInfo userInfo = new UserInfo();
        userInfo.setId(user.getId());
        userInfo.setPhoneNumber(user.getPhoneNumber());
        userInfo.setUsername(profile.getUsername());
        userInfo.setStorageUsed(profile.getStorageUsed());
        userInfo.setProfilePicture(profile.getProfilePictureUrl());
        userInfo.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        userInfo.setUpdatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null);

        return userInfo;
    }

    @Transactional
    public String updateProfileName(UpdateProfileDTO data) {
        String userId = userService.getCurrentUser();
        if (userId == null) {
            throw new IllegalStateException("User not authenticated.");
        }

        Profile profile = repo.findByUserId(userId);
        if (profile == null) {
            throw new IllegalStateException("Profile not found for user ID: " + userId);
        }

        String username = data.getUsername();
        if (username != null && !username.isEmpty()) {
            profile.setUsername(username);
        }

        repo.save(profile);
        return "Profile updated successfully";
    }

    public Profile getProfileByUserId(String userId) {
        return repo.findByUserId(userId);
    }

    @Transactional
    public String updateProfileImage(MultipartFile profileImage) {
        String userId = userService.getCurrentUser();

        if (userId == null) {
            throw new IllegalStateException("User not authenticated.");
        }

        Profile profile = repo.findByUserId(userId);
        if (profile == null) {
            throw new IllegalStateException("Profile not found for user ID: " + userId);
        }

        if (profileImage != null && !profileImage.isEmpty()) {
            String secureUrl = cloud.uploadAndReturnUrl(profileImage);
            if (secureUrl == null) {
                throw new IllegalStateException("Failed to upload profile image to Cloudinary.");
            }
            profile.setProfilePictureUrl(secureUrl);
        }

        repo.save(profile);
        return "Profile updated successfully";
    }

}
