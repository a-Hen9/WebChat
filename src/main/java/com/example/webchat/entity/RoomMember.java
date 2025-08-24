package com.example.webchat.entity;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "room_members")
public class RoomMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "room_id", nullable = false)
    private Long roomId;
    
    @Column(name = "role", columnDefinition = "ENUM('owner', 'admin', 'member') DEFAULT 'member'")
    private String role;
    
    @Column(name = "joined_at")
    private LocalDateTime joinedAt;
    
    @Column(name = "nickname")
    private String nickname;
    
    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
    }
}