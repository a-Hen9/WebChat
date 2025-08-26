          
# WebChat - 实时聊天室应用

## 项目简介

WebChat是一个基于Spring Boot和WebSocket开发的实时聊天室应用，支持用户注册、登录、创建房间、发送实时消息等功能。

## 技术栈

- **后端**: Spring Boot 2.7.0, Spring WebSocket, Spring Data JPA
- **数据库**: MySQL
- **前端**: HTML, CSS, JavaScript, jQuery, Bootstrap
- **构建工具**: Maven

## 功能特性

- 用户注册与登录
- 房间列表查看与管理
- 实时消息发送与接收
- 用户加入/离开房间通知
- 历史消息查看

## 快速开始

### 环境要求

- JDK 1.8 或更高版本
- Maven 3.6.0 或更高版本
- MySQL 8.0 或兼容版本

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <项目地址>
   cd WebChat
   ```

2. **配置数据库**

   创建MySQL数据库，并在`src/main/resources/application.properties`中配置数据库连接信息
   
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/webchat?useSSL=false&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=your-password
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
   ```

3. **构建项目**

   ```bash
   mvn clean package
   ```

4. **运行应用**

   ```bash
   mvn spring-boot:run
   ```
   或
   ```bash
   java -jar target/webchat-0.0.1-SNAPSHOT.jar
   ```

5. **访问应用**

   打开浏览器，访问 http://localhost:8080/

## 使用指南

### 1. 用户注册与登录

1. 打开应用首页 http://localhost:8080/
2. 在注册表单中输入用户名、邮箱和密码，点击"注册"按钮
3. 注册成功后，系统会自动跳转到登录页面
4. 输入用户名和密码，点击"登录"按钮进入聊天室页面

### 2. 房间管理

1. 登录成功后，您将看到房间列表
2. 点击"创建房间"按钮可以创建新的聊天室
3. 点击房间名称可以加入该聊天室

### 3. 发送消息

1. 加入房间后，在消息输入框中输入消息内容
2. 点击"发送"按钮或按Enter键发送消息
3. 您可以看到自己发送的消息和其他用户发送的消息

### 4. 查看历史消息

加入房间后，系统会自动加载该房间的历史消息

### 5. 退出登录

点击页面右上角的"退出登录"按钮，系统会清除您的登录状态并返回登录页面

## API接口说明

### 用户认证接口

- **用户注册**: `POST /auth/register`
  - 功能: 注册新用户
  - 请求体: 
    ```json
    {
      "username": "用户名",
      "email": "邮箱地址",
      "passwordHash": "密码"
    }
    ```
  - 响应: 成功返回"注册成功"，失败返回错误信息

- **用户登录**: `POST /auth/login`
  - 功能: 用户登录
  - 请求体: 
    ```json
    {
      "username": "用户名",
      "passwordHash": "密码"
    }
    ```
  - 响应: 成功重定向到`/chat.html`，失败返回错误信息

- **获取当前用户**: `GET /auth/current-user`
  - 功能: 获取当前登录用户信息
  - 响应: 用户信息JSON对象

- **退出登录**: `POST /auth/logout`
  - 功能: 清除用户会话信息
  - 响应: 重定向到首页

### 房间接口

- **获取房间列表**: `GET /rooms`
  - 功能: 获取所有房间列表
  - 响应: 房间列表JSON数组

- **创建房间**: `POST /rooms`
  - 功能: 创建新房间
  - 请求体: 
    ```json
    {
      "name": "房间名称",
      "description": "房间描述"
    }
    ```
  - 响应: 新创建的房间信息

### 消息接口

- **获取房间历史消息**: `GET /rooms/{roomId}/messages`
  - 功能: 获取指定房间的历史消息
  - 响应: 消息列表JSON数组

### WebSocket接口

- **发送消息**: `/app/chat/{roomId}/sendMessage`
  - 功能: 发送消息到指定房间
  - 消息格式: 
    ```json
    {
      "content": "消息内容",
      "messageType": "CHAT"
    }
    ```

- **加入房间**: `/app/chat/{roomId}/addUser`
  - 功能: 加入指定房间
  - 消息格式: 
    ```json
    {
      "senderName": "用户名",
      "messageType": "JOIN"
    }
    ```

## 项目结构

```
WebChat/
├── src/main/
│   ├── java/com/example/webchat/     # Java源代码
│   │   ├── controller/               # 控制器
│   │   ├── entity/                   # 实体类
│   │   ├── repository/               # 数据访问层
│   │   ├── service/                  # 业务逻辑层
│   │   └── WebChatApplication.java   # 应用入口
│   └── resources/                    # 资源文件
│       ├── static/                   # 静态资源(HTML, CSS, JS)
│       ├── templates/                # Thymeleaf模板
│       └── application.properties    # 应用配置
├── pom.xml                           # Maven依赖管理
└── README.md                         # 项目说明文档
```

## 常见问题解决

1. **无法连接WebSocket**
   - 确保浏览器支持WebSocket
   - 检查网络连接是否正常
   - 确认应用已成功启动

2. **消息无法显示**
   - 检查是否已登录且加入了房间
   - 刷新页面后重新尝试

3. **数据库连接失败**
   - 检查`application.properties`中的数据库配置是否正确
   - 确认MySQL服务是否正在运行

## 联系方式

如有任何问题或建议，请联系项目维护人员。
        