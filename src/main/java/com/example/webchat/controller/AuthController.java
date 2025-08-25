package com.example.webchat.controller;


import com.example.webchat.entity.User;
import com.example.webchat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/auth")
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    private UserService userService;

    // 注册
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User user) {
        logger.info("收到注册请求: {}", user.getUsername());
        try {
            if (userService.existsByUsername(user.getUsername())) {
                logger.warn("用户名已存在: {}", user.getUsername());
                return ResponseEntity.status(HttpStatus.CONFLICT).body("用户名已存在");
            }
            // 检查邮箱是否已存在，但仅在邮箱不为null时
            if (user.getEmail() != null && userService.existsByEmail(user.getEmail())) {
                logger.warn("邮箱已存在: {}", user.getEmail());
                return ResponseEntity.status(HttpStatus.CONFLICT).body("邮箱已存在");
            }
            userService.saveUser(user);
            logger.info("用户注册成功: {}", user.getUsername());
            return ResponseEntity.ok("注册成功");
        } catch (Exception e) {
            logger.error("注册过程中发生错误: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("注册失败");
        }
    }

    // 登录
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody User user, HttpSession session) {
        logger.info("收到登录请求: {}", user.getUsername());
        try {
            return userService.findByUsername(user.getUsername())
                    .filter(u -> {
                        boolean matches = passwordEncoder.matches(user.getPasswordHash(), u.getPasswordHash());
                        logger.info("密码匹配结果: {}", matches);
                        return matches;
                    })
                    .map(u -> {
                        session.setAttribute("username", u.getUsername()); // 保存会话
                        logger.info("用户登录成功: {}", u.getUsername());
                        return ResponseEntity.ok("登录成功");
                    })
                    .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户名或密码错误"));
        } catch (Exception e) {
            logger.error("登录过程中发生错误: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("登录失败");
        }
    }

    // 获取当前登录用户
    @GetMapping("/current-user")
    public ResponseEntity<String> getCurrentUser(HttpSession session) {
        String username = (String) session.getAttribute("username");
        return username != null ? ResponseEntity.ok(username) : ResponseEntity.noContent().build();
    }
}