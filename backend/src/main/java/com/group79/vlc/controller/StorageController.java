package com.group79.vlc.controller;

import java.util.List;
import java.io.IOException;
import java.io.InputStream;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.group79.vlc.dto.FileUploadDTO;
import com.group79.vlc.model.Storage;
import com.group79.vlc.response.RegisterResponse;
import com.group79.vlc.service.StorageService;
import static com.group79.vlc.repo.FileUploadProgressHandler.sessions;

@RestController
@CrossOrigin
@RequestMapping("/storage")
public class StorageController {

    private final StorageService service;

    public StorageController(StorageService service) {
        this.service = service;
    }

    @GetMapping()
    public ResponseEntity<RegisterResponse<List<?>>> getStorageInfo() {

        try {
            // get all the list of storage information
            List<Storage> storageList = service.getAllStorageInfo();

            if (storageList == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new RegisterResponse<>(false, "No storage information found.", null));
            }

            return ResponseEntity
                    .ok(new RegisterResponse<>(true, "Storage information retrieved successfully.", storageList));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false,
                            "An error occurred while retrieving storage information: " + e.getMessage(), null));
        }

    }

    @GetMapping("/{id}")
    public ResponseEntity<RegisterResponse<Storage>> getStorageInfoById(@PathVariable String id) {

        try {
            // Get the storage information by ID
            Storage storage = service.getStorageInfoById(id);

            if (storage == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new RegisterResponse<>(false, "No storage information found.", null));
            }

            return ResponseEntity
                    .ok(new RegisterResponse<>(true, "Storage information retrieved successfully.", storage));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false,
                            "An error occurred while retrieving storage information: " + e.getMessage(), null));
        }

    }

    @PostMapping("/add")
    public ResponseEntity<RegisterResponse<?>> addStorageInfo(@RequestPart("metadata") FileUploadDTO metadata,
            @RequestPart("file") MultipartFile file, @RequestPart("sessionId") String sessionId) {

        try (InputStream inputStream = file.getInputStream()) {

            long totalBytes = file.getSize();
            byte[] buffer = new byte[1024 * 100];
            int bytesRead;
            long uploaded = 0;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                uploaded += bytesRead;

                // Send progress update over WebSocket
                WebSocketSession session = sessions.get(sessionId);
                if (session != null && session.isOpen()) {
                    int progress = (int) ((uploaded * 100) / totalBytes);
                    session.sendMessage(new TextMessage(progress + "%"));
                }

            }

            // Add the file upload metadata and file to the storage
            String results = service.add(metadata, file);

            if ("Error".equals(results)) {
                throw new RuntimeException("File upload failed in service.");
            }

            // Save the storage information
            return ResponseEntity.ok(new RegisterResponse<>(true, "Storage information added successfully.", results));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false, "Error processing file: " + e.getMessage(), null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new RegisterResponse<>(false, "File upload failed: " + e.getMessage(), null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false,
                            "An unexpected error occurred during file upload: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RegisterResponse<?>> deleteStorage(@PathVariable String id) {

        try {
            // delete stored information by ID
            service.deleteInfoById(id);

            return ResponseEntity.ok(new RegisterResponse<>(true, "Storage information deleted successfully.", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new RegisterResponse<>(false,
                            "An error occurred while deleting storage information: " + e.getMessage(), null));
        }

    }

}