package com.group79.vlc.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.group79.vlc.dto.FileUploadDTO;
import com.group79.vlc.model.Profile;
import com.group79.vlc.model.Storage;
import com.group79.vlc.repo.ProfileRepo;
import com.group79.vlc.repo.StorageRepo;

@Service
public class StorageService {

    private final UserService userService;
    private final CloudinaryService cloud;
    private final StorageRepo storageRepo;
    private final ProfileServices profileService;
    private final ProfileRepo profileRepository;

    public StorageService(UserService userService, CloudinaryService cloud, StorageRepo storageRepo,
            ProfileServices profileService, ProfileRepo profileRepository) {
        this.userService = userService;
        this.cloud = cloud;
        this.storageRepo = storageRepo;
        this.profileService = profileService;
        this.profileRepository = profileRepository;
    }

    public List<Storage> getAllStorageInfo() {
        String userId = userService.getCurrentUser();

        if (userId == null) {
            throw new IllegalStateException("User not authenticated.");
        }
        // Fetch storage information for the user
        return storageRepo.findAllByUserId(userId);
    }

    public void deleteInfoById(String id) {
        Storage data = storageRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Storage data not found with ID: " + id));

        boolean results = cloud.delete(data.getStorageLocation());

        if (!results) {
            throw new IllegalStateException("Failed to delete file from cloud storage.");
        }
    }

    public Storage getStorageInfoById(String id) {
        String userId = userService.getCurrentUser();

        if (userId == null) {
            throw new IllegalStateException("User not authenticated.");
        }

        return storageRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Storage data not found with ID: " + id));
    }

    public String add(FileUploadDTO metadata, MultipartFile file) {
        String userId = userService.getCurrentUser();
        if (userId == null) {
            throw new IllegalStateException("User not authenticated.");
        }

        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or not provided.");
        }

        Storage data = new Storage();
        data.setUserId(userId);
        data.setId(UUID.randomUUID().toString());
        data.setCreatedAt(java.time.LocalDateTime.now());

        data.setFileName(metadata.getFileName() != null && !metadata.getFileName().isEmpty() ? metadata.getFileName()
                : file.getOriginalFilename());
        data.setFileType(metadata.getFileType() != null && !metadata.getFileType().isEmpty() ? metadata.getFileType()
                : file.getContentType());
        data.setDescription(metadata.getDescription() != null ? metadata.getDescription() : "No description provided");
        data.setSize(file.getSize());

        Profile userProfile = profileService.getProfileByUserId(userId);
        if (userProfile == null) {
            throw new IllegalStateException("User profile not found.");
        }

        double fileSizeMB = (double) file.getSize() / (1024 * 1024);
        userProfile.setStorageUsed(userProfile.getStorageUsed() + fileSizeMB);

        String secureUrl = cloud.uploadAndReturnUrl(file);
        if (secureUrl == null) {
            throw new IllegalStateException("Failed to upload file to cloud storage.");
        }
        data.setStorageLocation(secureUrl);

        profileRepository.save(userProfile);
        storageRepo.save(data);
        return "success";
    }

}
