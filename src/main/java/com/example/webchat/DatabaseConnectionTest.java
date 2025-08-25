package com.example.webchat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnectionTest {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/webchat?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
        String username = "root";
        String password = "666666";
        
        try {
            System.out.println("Attempting to connect to the database...");
            Connection connection = DriverManager.getConnection(url, username, password);
            System.out.println("Successfully connected to the database!");
            connection.close();
        } catch (SQLException e) {
            System.err.println("Failed to connect to the database: " + e.getMessage());
            e.printStackTrace();
        }
    }
}