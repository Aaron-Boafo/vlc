package com.group79.vlc.util;

import org.springframework.stereotype.Component;
import java.security.SecureRandom;

@Component
public class OtpUtil {

    public static String generateOtp(int length) {
        String numbers = "0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder();

        for (int i = 0; i < length; i++) {
            otp.append(numbers.charAt(random.nextInt(numbers.length())));
        }

        return otp.toString();
    }
}
