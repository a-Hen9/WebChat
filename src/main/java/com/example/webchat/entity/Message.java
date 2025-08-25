package com.example.webchat.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "room_id", nullable = false)
    private Long roomId;
    
    @Column(name = "sender_id", nullable = false)
    private Long senderId;
    
    @Column(nullable = false, length = 1000)
    private String content;
    
    @Column(name = "message_type", columnDefinition = "ENUM('text', 'image', 'file', 'system') DEFAULT 'text'")
    private String messageType;
    
    @Column(name = "file_url")
    private String fileUrl;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // 外键关系映射
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", insertable = false, updatable = false)
    private Room room;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", insertable = false, updatable = false)
    private User sender;
    
    public Long getSenderId() {
        return senderId;
    }
    
    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public Long getRoomId() {
        return roomId;
    }

    public void setRoomId(Long roomId) {
        this.roomId = roomId;
    }
}