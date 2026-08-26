package com.group79.vlc.repo;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.group79.vlc.model.Profile;

@Repository
public interface  ProfileRepo extends MongoRepository<Profile, String> {

    Profile findByUserId(String userId);

}
