package com.example.webchat.entity;

import lombok.Data;
import javax.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Data
@Entity
@Table(name = "room_members")
@IdClass(RoomMember.RoomMemberId.class)
public class RoomMember {
    @Id
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Id
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
    
    // 外键关系映射
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", insertable = false, updatable = false)
    private Room room;
    
    // 复合主键类
    @Data
    @Embeddable
    public static class RoomMemberId implements Serializable {
        private Long userId;
        private Long roomId;
        
        // 默认构造函数
        public RoomMemberId() {}
        
        // 带参数的构造函数
        public RoomMemberId(Long userId, Long roomId) {
            this.userId = userId;
            this.roomId = roomId;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            RoomMemberId that = (RoomMemberId) o;
            return Objects.equals(userId, that.userId) && Objects.equals(roomId, that.roomId);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(userId, roomId);
        }
    }
    
    // Getter和Setter方法
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public Long getRoomId() {
        return roomId;
    }
    
    public void setRoomId(Long roomId) {
        this.roomId = roomId;
    }
    
    public String getRole() {
        return role;
    }
    
    public void setRole(String role) {
        this.role = role;
    }
    
    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
    
    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }
    
    public String getNickname() {
        return nickname;
    }
    
    public void setNickname(String nickname) {
        this.nickname = nickname;
    }
}