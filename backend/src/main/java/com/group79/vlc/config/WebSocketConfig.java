package com.group79.vlc.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.*;
import com.group79.vlc.repo.FileUploadProgressHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new FileUploadProgressHandler(), "/upload-progress")
                .setAllowedOrigins("*"); // adjust CORS as needed
    }
}
