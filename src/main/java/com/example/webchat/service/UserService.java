package com.example.webchat.service;

import com.example.webchat.entity.User;

import java.util.Optional;

public interface UserService {
    User saveUser(User user);
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);
}