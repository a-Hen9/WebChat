package com.example.webchat.service;

import com.example.webchat.entity.Room;

import java.util.List;
import java.util.Optional;

public interface RoomService {
    Room saveRoom(Room room);
    Optional<Room> findById(Long id);
    List<Room> findAll();
    List<Room> findByIsPrivate(Boolean isPrivate);
    void deleteById(Long id);
}