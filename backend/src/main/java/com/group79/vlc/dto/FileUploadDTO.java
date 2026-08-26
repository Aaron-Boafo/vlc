package com.group79.vlc.dto;

import org.springframework.stereotype.Component;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Component
@AllArgsConstructor
@Data
@NoArgsConstructor
public class FileUploadDTO {
    
    private String fileName;
    private String fileType;
    private String description;
}
