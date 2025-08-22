package com.example.webchat.controller;


import com.example.webchat.entity.User;
import com.example.webchat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@RestController
@RequestMapping("/auth")
public class AuthController {
    
    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    private UserService userService;

    // 注册
    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User user) {
        if (userService.existsByUsername(user.getUsername())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("用户名已存在");
        }
        userService.saveUser(user);
        return ResponseEntity.ok("注册成功");
    }

    // 登录
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody User user, HttpSession session) {
        return userService.findByUsername(user.getUsername())
                .filter(u -> passwordEncoder.matches(user.getPassword(), u.getPassword()))
                .map(u -> {
                    session.setAttribute("username", u.getUsername()); // 保存会话
                    return ResponseEntity.ok("登录成功");
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("用户名或密码错误"));
    }

    // 获取当前登录用户
    @GetMapping("/current-user")
    public ResponseEntity<String> getCurrentUser(HttpSession session) {
        String username = (String) session.getAttribute("username");
        return username != null ? ResponseEntity.ok(username) : ResponseEntity.noContent().build();
    }
}