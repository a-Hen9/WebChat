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
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;
    
    @Column(nullable = false, length = 1000)
    private String content;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // 手动添加getter方法
    public User getUser() {
        return user;
    }
    
    public Room getRoom() {
        return room;
    }
    
    public String getContent() {
        return content;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // 手动添加setter方法
    public void setUser(User user) {
        this.user = user;
    }
    
    public void setRoom(Room room) {
        this.room = room;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
}