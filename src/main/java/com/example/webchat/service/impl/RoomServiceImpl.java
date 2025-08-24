package com.example.webchat.service.impl;

import com.example.webchat.entity.Room;
import com.example.webchat.repository.RoomRepository;
import com.example.webchat.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class RoomServiceImpl implements RoomService {
    
    @Autowired
    private RoomRepository roomRepository;
    
    @Override
    public Room saveRoom(Room room) {
        return roomRepository.save(room);
    }
    
    @Override
    public Optional<Room> findById(Long id) {
        return roomRepository.findById(id);
    }
    
    @Override
    public List<Room> findAll() {
        return roomRepository.findAll();
    }
    
    @Override
    public List<Room> findByIsPrivate(Boolean isPrivate) {
        return roomRepository.findByIsPrivate(isPrivate);
    }
    
    @Override
    public void deleteById(Long id) {
        roomRepository.deleteById(id);
    }
}