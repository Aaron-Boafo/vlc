package com.group79.vlc.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(@Value("${cloudinary.cloud_name}") String cloudName,
            @Value("${cloudinary.api_key}") String apiKey,
            @Value("${cloudinary.api_secret}") String apiSecret) {
        Map<String, String> config = new HashMap<>();
        config.put("cloud_name", cloudName);
        config.put("api_key", apiKey);
        config.put("api_secret", apiSecret);
        this.cloudinary = new Cloudinary(config);
    }

    // Uploads file and returns Cloudinary result map
    public Map<String, Object> upload(MultipartFile multipartFile) {
        try {
            File file = convert(multipartFile);
            Map<String, Object> result = cloudinary.uploader().upload(file, ObjectUtils.emptyMap());

            // Delete temp file
            if (!Files.deleteIfExists(file.toPath())) {
                throw new IOException("Failed to delete temporary file: " + file.getAbsolutePath());
            }

            return result;
        } catch (IOException e) {
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("error", "Upload failed: " + e.getMessage());
            return errorMap;
        }
    }

    // Uploads and returns only the secure URL of the uploaded file
    public String uploadAndReturnUrl(MultipartFile multipartFile) {
        Map<String, Object> result = upload(multipartFile);
        if (result.containsKey("secure_url")) {
            return result.get("secure_url").toString();
        } else {
            return null; // or throw an exception based on your use case
        }
    }

    // Deletes file by public_id
    @SuppressWarnings("rawtypes")
    public boolean delete(String publicId) {
        try {
            Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            return "ok".equals(result.get("result"));
        } catch (IOException e) {
            System.err.println("Error deleting file: " + e.getMessage());
            return false;
        }
    }

    // Converts MultipartFile to regular File
    private File convert(MultipartFile multipartFile) throws IOException {
        File file = new File(System.getProperty("java.io.tmpdir") + "/" + multipartFile.getOriginalFilename());
        multipartFile.transferTo(file);
        return file;
    }
}
