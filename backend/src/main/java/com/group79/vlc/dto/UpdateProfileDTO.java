package com.group79.vlc.dto;

import org.springframework.stereotype.Component;

@Component
public class UpdateProfileDTO {
    private String username;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    @Override
    public String toString() {
        return "UpdateProfileDTO{" +
                "username='" + username + '\'' +
                '}';
    }

    public UpdateProfileDTO() {
    }

    public UpdateProfileDTO(String username) {
        this.username = username;
    }
}
