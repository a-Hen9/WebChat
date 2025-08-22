package com.example.webchat.controller;

import com.example.webchat.entity.Message;
import com.example.webchat.entity.Room;
import com.example.webchat.entity.User;
import com.example.webchat.repository.MessageRepository;
import com.example.webchat.repository.RoomRepository;
import com.example.webchat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;

import javax.servlet.http.HttpSession;
import java.util.Optional;

@Controller
public class ChatController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    // 发送房间消息（持久化并广播到指定房间）
    @MessageMapping("/chat/{roomId}/sendMessage")
    @SendTo("/topic/room/{roomId}") // 按房间ID广播
    public Message sendMessage(@Payload Message message, 
                             @PathVariable Long roomId,
                             SimpMessageHeaderAccessor headerAccessor) {
        // 从会话获取当前用户
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        User user = userRepository.findByUsername(username).orElseThrow();
        Room room = roomRepository.findById(roomId).orElseThrow();

        // 填充消息关联信息
        message.setUser(user);
        message.setRoom(room);
        return messageRepository.save(message); // 保存到数据库
    }

    // 加入房间
    @MessageMapping("/chat/{roomId}/addUser")
    @SendTo("/topic/room/{roomId}")
    public Message addUser(@Payload Message message, 
                          @PathVariable Long roomId,
                          SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");
        headerAccessor.getSessionAttributes().put("roomId", roomId); // 记录当前房间
        message.setContent(username + "加入了房间");
        return message;
    }
}