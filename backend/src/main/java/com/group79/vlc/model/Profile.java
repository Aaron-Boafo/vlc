package com.group79.vlc.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "profile")
public class Profile {

    @Id
    private String id;

    private String userId; // Reference to the user ID
    private String username;
    private double storageUsed;
    private String profilePictureUrl;
    

}
