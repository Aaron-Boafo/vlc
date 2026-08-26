package com.group79.vlc.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "store")
public class Storage {

    @Id
    private String id;
    private String userId; // Reference to the user ID
    
    private String fileName; // Name of the file stored
    private double size; // Amount of storage used by the user
    private String fileType; // Type of storage (e.g., "mp3", "mp4", "image", etc.)
    private String storageLocation; // Location of the storage (e.g., path or URL)

    private LocalDateTime createdAt; 
    private String description;
   


}
