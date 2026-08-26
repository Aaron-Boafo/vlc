package com.group79.vlc.repo;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.group79.vlc.model.Storage;

@Repository
public interface StorageRepo extends MongoRepository<Storage, String> {

    List<Storage> findAllByUserId(String userId);
    
}
