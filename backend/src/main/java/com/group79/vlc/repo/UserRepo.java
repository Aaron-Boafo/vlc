package com.group79.vlc.repo;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.group79.vlc.model.Users;

@Repository
public interface UserRepo extends MongoRepository<Users, String> {
    Users findByPhoneNumber(String phoneNumber);
    Optional<Users> findById(String id);
}