package com.example.webchat.controller;

import com.example.webchat.entity.Message;
import com.example.webchat.entity.Room;
import com.example.webchat.entity.RoomMember;
import com.example.webchat.entity.User;
import com.example.webchat.repository.MessageRepository;
import com.example.webchat.repository.RoomMemberRepository;
import com.example.webchat.repository.RoomRepository;
import com.example.webchat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.List;

@Controller
public class ChatController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;
    
    @Autowired
    private RoomMemberRepository roomMemberRepository;

    // 发送房间消息（持久化并广播到指定房间）
    @MessageMapping("/chat/{roomId}/sendMessage")
    @SendTo("/topic/chat/{roomId}/public") // 按房间ID广播
    public Message sendMessage(@Payload Message message, 
                             @DestinationVariable Long roomId,
                             SimpMessageHeaderAccessor headerAccessor) {
        try {
            // 从会话获取当前用户
            String username = (String) headerAccessor.getSessionAttributes().get("username");
            System.out.println("Sending message - Username from session: " + username);
            
            if (username == null || username.isEmpty()) {
                throw new RuntimeException("User not logged in or session expired");
            }
            
            User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found: " + username));
            Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

            // 保存原始消息类型
            String originalMessageType = message.getMessageType();

            // 使用已有的setter方法
            message.setSenderId(user.getId());
            message.setRoomId(room.getId());
            message.setSenderName(username);
            
            // 转换前端消息类型到后端数据库类型
            if (message.getMessageType() != null && message.getMessageType().equals("CHAT")) {
                message.setMessageType("text"); // 将'CHAT'转换为'text'
            } else if (message.getMessageType() == null) {
                message.setMessageType("text"); // 默认设置为文本消息
            }
            
            // 设置消息创建时间
            message.setCreatedAt(LocalDateTime.now());
            
            // 保存消息到数据库
            Message savedMessage = messageRepository.save(message);
            
            // 返回给前端时恢复原始消息类型（确保前端能正确显示）
            if (originalMessageType != null) {
                savedMessage.setMessageType(originalMessageType);
            } else {
                savedMessage.setMessageType("CHAT"); // 默认返回CHAT类型
            }
            
            return savedMessage;
        } catch (Exception e) {
            System.err.println("Error sending message: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error sending message: " + e.getMessage());
        }
    }

    // 加入房间
    @MessageMapping("/chat/{roomId}/addUser")
    @SendTo("/topic/chat/{roomId}/public")
    public Message addUser(@Payload Message message, 
                          @DestinationVariable Long roomId,
                          SimpMessageHeaderAccessor headerAccessor) {
        try {
            String username = (String) headerAccessor.getSessionAttributes().get("username");
            System.out.println("User joining room - Username: " + username + ", RoomId: " + roomId);
            
            User user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
            Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Room not found"));
            
            // 记录用户房间信息
            headerAccessor.getSessionAttributes().put("roomId", roomId);
            
            // 创建房间成员记录
            RoomMember roomMember = new RoomMember();
            roomMember.setUserId(user.getId());
            roomMember.setRoomId(roomId);
            roomMember.setRole("member"); // 默认角色
            roomMemberRepository.save(roomMember);
            
            // 只使用已有的setter方法
            message.setContent(username + "加入了房间");
            message.setSenderId(user.getId());
            message.setRoomId(roomId);
            message.setSenderName(username);
            // 数据库存储使用'system'类型，但返回给前端时使用'JOIN'类型
            message.setMessageType("system"); // 数据库存储类型
            message.setCreatedAt(LocalDateTime.now()); // 设置时间戳
            
            // 保存到数据库
            Message savedMessage = messageRepository.save(message);
            
            // 返回给前端时设置为'JOIN'类型
            savedMessage.setMessageType("JOIN");
            
            System.out.println("User " + username + " successfully joined room " + roomId);
            return savedMessage;
        } catch (Exception e) {
            System.err.println("Error adding user to room: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error adding user: " + e.getMessage());
        }
    }

    // 获取房间历史消息
    @GetMapping("/rooms/{roomId}/messages")
    @ResponseBody
    public List<Message> getRoomMessages(@PathVariable Long roomId) {
        List<Message> messages = messageRepository.findByRoomIdOrderByCreatedAtAsc(roomId);
        // 为每条消息设置发送者名字
        for (Message message : messages) {
            if (message.getSenderId() != null) {
                User user = userRepository.findById(message.getSenderId()).orElse(null);
                if (user != null) {
                    message.setSenderName(user.getUsername());
                }
            }
        }
        return messages;
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}