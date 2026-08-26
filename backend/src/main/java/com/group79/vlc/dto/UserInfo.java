package com.group79.vlc.dto;

import org.springframework.stereotype.Component;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Component
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class UserInfo {

    private String id;
    private String phoneNumber;
    private String username;

    private double storageUsed;
    private String profilePicture;
    private String createdAt;
    private String updatedAt;

}
