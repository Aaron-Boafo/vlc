package com.group79.vlc.response;

import org.springframework.stereotype.Component;



@Component
public class RegisterResponse<T> {
    private boolean status;
    private String message;
    private T data;

    public RegisterResponse() {
    }

    public RegisterResponse(boolean status, String message, T data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
    public boolean isStatus() {
        return status;
    }
    public void setStatus(boolean status) {
        this.status = status;
    }
    public String getMessage() {
        return message;
    }

    //getters
    public void setMessage(String message) {
        this.message = message;
    }
    public T getData() {
        return data;
    }
    public void setData(T data) {
        this.data = data;
    }
}
