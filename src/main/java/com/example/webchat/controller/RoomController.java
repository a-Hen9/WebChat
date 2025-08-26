package com.example.webchat.controller;

import com.example.webchat.entity.Room;
import com.example.webchat.service.RoomService;
import com.example.webchat.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.List;

@RestController
@RequestMapping("/rooms")
public class RoomController {

    @Autowired
    private RoomService roomService;
    
    @Autowired
    private UserService userService;

    // 创建房间
    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Room room, HttpSession session) {
        try {
            // 检查房间名称是否为空
            if (room.getName() == null || room.getName().trim().isEmpty()) {
                throw new RuntimeException("房间名称不能为空");
            }
            
            // 设置房间创建者
            String username = (String) session.getAttribute("username");
            if (username != null) {
                userService.findByUsername(username).ifPresent(user -> room.setCreatedBy(user.getId()));
            }
            return ResponseEntity.ok(roomService.saveRoom(room));
        } catch (Exception e) {
            throw new RuntimeException("Error creating room: " + e.getMessage());
        }
    }

    // 获取所有房间
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        try {
            return ResponseEntity.ok(roomService.findAll());
        } catch (Exception e) {
            throw new RuntimeException("Error getting rooms: " + e.getMessage());
        }
    }
    
    // 根据私有性获取房间
    @GetMapping("/private/{isPrivate}")
    public ResponseEntity<List<Room>> getRoomsByPrivacy(@PathVariable Boolean isPrivate) {
        try {
            return ResponseEntity.ok(roomService.findByIsPrivate(isPrivate));
        } catch (Exception e) {
            throw new RuntimeException("Error getting rooms by privacy: " + e.getMessage());
        }
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}