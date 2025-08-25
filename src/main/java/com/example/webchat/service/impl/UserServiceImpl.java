package com.example.webchat.service.impl;

import com.example.webchat.entity.User;
import com.example.webchat.repository.UserRepository;
import com.example.webchat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

@Service
public class UserServiceImpl implements UserService {
    
    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    
    @Autowired
    private UserRepository userRepository;
    
    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    
    @Override
    public User saveUser(User user) {
        logger.info("开始保存用户: {}", user.getUsername());
        logger.info("用户信息 - Email: {}, PasswordHash: {}", user.getEmail(), user.getPasswordHash());
        try {
            // 加密密码
            String encodedPassword = passwordEncoder.encode(user.getPasswordHash());
            user.setPasswordHash(encodedPassword);
            logger.info("密码加密完成");
            User savedUser = userRepository.save(user);
            logger.info("用户保存成功: {}", savedUser.getUsername());
            return savedUser;
        } catch (Exception e) {
            logger.error("保存用户时发生错误: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    @Override
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    @Override
    public Boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }
    
    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    
    @Override
    public Boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}