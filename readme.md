          
# WebChat API 测试指南

本文档将指导您如何使用Postman测试WebChat应用的各个API接口。

## 接口列表

1. **用户注册**
   - URL: `POST /auth/register`
   - 功能: 注册新用户

2. **用户登录**
   - URL: `POST /auth/login`
   - 功能: 用户登录

3. **获取当前用户**
   - URL: `GET /auth/current-user`
   - 功能: 获取当前登录用户信息

## 测试步骤

### 1. 用户注册

1. 打开Postman
2. 创建一个新的请求
3. 设置请求方法为 `POST`
4. 设置请求URL为: `http://localhost:8080/auth/register`
5. 点击`Body`选项卡
6. 选择`raw`，然后从下拉菜单中选择`JSON`
7. 在文本框中输入以下JSON数据:
   ```json
   {
     "username": "testuser",
     "email": "testuser@example.com",
     "password": "testpassword"
   }
   ```
8. 点击`Send`按钮发送请求
9. 预期响应:
   - 成功: `200 OK` 状态码，响应体为 "注册成功"
   - 用户名已存在: `409 Conflict` 状态码，响应体为 "用户名已存在"

### 2. 用户登录

1. 在Postman中创建一个新的请求
2. 设置请求方法为 `POST`
3. 设置请求URL为: `http://localhost:8080/auth/login`
4. 点击`Body`选项卡
5. 选择`raw`，然后从下拉菜单中选择`JSON`
6. 在文本框中输入以下JSON数据:
   ```json
   {
     "username": "testuser",
     "password": "testpassword"
   }
   ```
7. 点击`Send`按钮发送请求
8. 预期响应:
   - 成功: `200 OK` 状态码，响应体为 "登录成功"
   - 失败: `401 Unauthorized` 状态码，响应体为 "用户名或密码错误"

### 3. 获取当前用户

1. 在Postman中创建一个新的请求
2. 设置请求方法为 `GET`
3. 设置请求URL为: `http://localhost:8080/auth/current-user`
4. 重要: 确保在请求头中包含会话信息
   - 点击`Headers`选项卡
   - 添加一个键值对: `Cookie` = `JSESSIONID=...` (从登录响应中获取)
5. 点击`Send`按钮发送请求
6. 预期响应:
   - 成功: `200 OK` 状态码，响应体为当前用户名
   - 未登录: `204 No Content` 状态码，无响应体

## 注意事项

1. 确保应用已在本地运行在端口8080上
2. 登录成功后，服务器会返回一个会话ID (JSESSIONID)，在后续需要认证的请求中必须包含此ID
3. 密码在服务器端会进行BCrypt加密处理
4. 用户名必须唯一，重复注册会返回错误
        