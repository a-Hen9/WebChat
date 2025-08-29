/**
 * WebSocketManager - 处理WebSocket连接和消息发送功能
 */
// 为浏览器环境提供process对象模拟
globalThis.process = globalThis.process || {
    env: {
        NODE_ENV: 'development' // 默认为开发环境，可以在生产环境中修改
    }
};
class WebSocketManager {
    constructor() {
        this.stompClient = null;
        this.currentRoomId = null;
        this.currentUsername = null;
        this.connectionCallbacks = [];
        this.disconnectionCallbacks = [];
        this.messageCallbacks = [];
        this.errorCallbacks = [];
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.baseReconnectDelay = 3000; // 基础重连延迟
        this.messageQueue = []; // 消息队列，用于存储断连时的消息
        this.eventSubscriptions = new Map(); // 事件订阅系统
        this.heartbeatInterval = null; // 心跳检测定时器
        this.lastHeartbeatTime = Date.now(); // 上次心跳时间
        this.heartbeatTimeout = 30000; // 心跳超时时间（毫秒）
        this.isAutoReconnectEnabled = true; // 是否启用自动重连
        this.isConnectionBroken = false; // 连接是否已断开
    }

    /**
     * 连接到WebSocket服务器
     * @param {number} roomId - 房间ID
     * @param {string} username - 用户名
     * @param {boolean} autoReconnect - 是否自动重连
     * @returns {Promise}
     */
    connect(roomId, username, autoReconnect = true) {
        return new Promise((resolve, reject) => {
            if (this.isConnecting) {
                reject(new Error('正在连接中...'));
                return;
            }

            // 如果已经连接，先断开
            if (this.stompClient !== null && this.stompClient.connected) {
                this.disconnect();
            }

            this.currentRoomId = roomId;
            this.currentUsername = username;
            this.isConnecting = true;
            this.isAutoReconnectEnabled = autoReconnect;

            // 记录连接开始时间
                const startTime = Date.now();
                
                try {
                    // 直接连接到服务器WebSocket端点，不受当前页面路径影响
                    const wsUrl = '/ws';
                    console.log(`[WebSocket] 连接URL: ${wsUrl}`);
                    
                    const socket = new SockJS(wsUrl);
                    this.stompClient = Stomp.over(socket);

                // 配置日志级别
                this.stompClient.debug = (str) => {
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[WebSocket] ${str}`);
                    }
                };

                // 设置连接超时
                const connectionTimeout = setTimeout(() => {
                    this.isConnecting = false;
                    reject(new Error('连接超时，请检查网络或服务器状态'));
                    this._cleanupConnection();
                }, 10000);

                // 设置心跳配置
                this.stompClient.heartbeat.outgoing = 20000;
                this.stompClient.heartbeat.incoming = 20000;

                this.stompClient.connect({}, (frame) => {
                    clearTimeout(connectionTimeout); // 清除超时计时器
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.isConnectionBroken = false;

                    console.log('Connected: ' + frame);
                    console.log(`[WebSocket] 连接耗时: ${Date.now() - startTime}ms`);

                    // 订阅房间消息
                    this._subscribeToRoomMessages(roomId);

                    // 订阅系统通知
                    this._subscribeToSystemNotifications();

                    // 订阅心跳响应
                    this._subscribeToHeartbeat();

                    // 通知服务器用户加入
                    this.stompClient.send(`/app/chat/${roomId}/addUser`, {}, JSON.stringify({
                        senderName: username,
                        messageType: 'JOIN'
                    }));

                    // 启动心跳检测
                    this._startHeartbeatMonitoring();

                    // 发送队列中的消息
                    this._sendQueuedMessages();

                    // 调用连接成功回调
                    this._callCallbacks(this.connectionCallbacks, roomId);
                    this._emit('connected', { roomId: roomId, username: username });

                    resolve(frame);
                }, (error) => {
                    clearTimeout(connectionTimeout); // 清除超时计时器
                this.isConnecting = false;
                
                // 格式化错误信息
                const errorMessage = error?.message || error?.toString() || '连接失败';
                console.error('WebSocket连接错误: ', errorMessage);

                // 尝试重连
                if (this.isAutoReconnectEnabled) {
                    this._attemptReconnect(roomId, username);
                }
                
                // 调用错误回调
                this._callCallbacks(this.errorCallbacks, errorMessage);
                this._emit('error', { type: 'connection', message: errorMessage });

                reject(new Error(errorMessage));
            });
            } catch (err) {
                this.isConnecting = false;
                const errorMessage = err?.message || err?.toString() || '连接异常';
                console.error('WebSocket连接异常: ', errorMessage);
                reject(new Error(errorMessage));
            }
        });
    }

    /**
     * 尝试重连
     * @private
     */
    _attemptReconnect(roomId, username) {
        if (!this.isAutoReconnectEnabled) {
            console.log('自动重连已禁用');
            return;
        }
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            
            // 指数退避算法，增加重连延迟
            const delay = Math.min(
                this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
                30000 // 最大延迟30秒
            );
            
            console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})... 延迟: ${delay}ms`);
            
            // 调用重连开始回调
            this._emit('reconnect_attempt', {
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts,
                delay: delay
            });

            setTimeout(() => {
                this.connect(roomId, username, true)
                    .then(() => {
                        console.log('重连成功');
                        this._emit('reconnected', { roomId: roomId, username: username });
                    })
                    .catch(err => {
                        console.error('重连失败:', err?.message || err);
                    });
            }, delay);
        } else {
            console.error('达到最大重连次数，停止重连');
            this.isConnectionBroken = true;
            this._callCallbacks(this.disconnectionCallbacks, 'reconnect_failed');
            this._emit('disconnected', { reason: 'reconnect_failed' });
        }
    }

    /**
     * 断开WebSocket连接
     * @param {boolean} manual - 是否为手动断开
     */
    disconnect(manual = true) {
        // 停止心跳检测
        this._stopHeartbeatMonitoring();
        
        if (this.stompClient !== null) {
            try {
                this.stompClient.disconnect(() => {
                    console.log('WebSocket已断开连接');
                    
                    // 清除事件订阅
                    this._clearSubscriptions();
                    
                    // 调用回调
                    const reason = manual ? 'manual_disconnect' : 'auto_disconnect';
                    this._callCallbacks(this.disconnectionCallbacks, reason);
                    this._emit('disconnected', { reason: reason });
                    
                    // 清理状态
                    this.stompClient = null;
                    this.currentRoomId = null;
                    this.isConnectionBroken = false;
                    
                    // 手动断开时重置重连尝试
                    if (manual) {
                        this.reconnectAttempts = 0;
                    }
                });
            } catch (error) {
                console.error('断开连接出错:', error);
                this._cleanupConnection();
            }
        }
    }
    
    /**
     * 清理连接资源
     * @private
     */
    _cleanupConnection() {
        try {
            if (this.stompClient) {
                this.stompClient.disconnect();
            }
        } catch (error) {
            // 忽略清理过程中的错误
        }
        
        this._stopHeartbeatMonitoring();
        this._clearSubscriptions();
        
        this.stompClient = null;
        this.isConnecting = false;
        this.isConnectionBroken = false;
    }
    
    /**
     * 订阅房间消息
     * @private
     */
    _subscribeToRoomMessages(roomId) {
        try {
            const subscription = this.stompClient.subscribe(
                `/topic/chat/${roomId}/public`, 
                (messageOutput) => {
                    try {
                        const message = JSON.parse(messageOutput.body);
                        this._handleMessage(message);
                    } catch (parseError) {
                        console.error('解析消息失败:', parseError);
                        this._emit('error', { type: 'message_parse', error: parseError });
                    }
                }
            );
            
            // 保存订阅以便后续清理
            this.eventSubscriptions.set(`room_${roomId}`, subscription);
        } catch (error) {
            console.error('订阅房间消息失败:', error);
            this._emit('error', { type: 'subscription', error: error });
        }
    }
    
    /**
     * 订阅系统通知
     * @private
     */
    _subscribeToSystemNotifications() {
        try {
            if (this.currentUsername) {
                const subscription = this.stompClient.subscribe(
                    `/user/${this.currentUsername}/queue/notifications`,
                    (messageOutput) => {
                        try {
                            const notification = JSON.parse(messageOutput.body);
                            this._emit('notification', notification);
                        } catch (parseError) {
                            console.error('解析通知失败:', parseError);
                        }
                    }
                );
                
                this.eventSubscriptions.set('system_notifications', subscription);
            }
        } catch (error) {
            console.warn('订阅系统通知失败:', error);
        }
    }
    
    /**
     * 订阅心跳响应
     * @private
     */
    _subscribeToHeartbeat() {
        try {
            const subscription = this.stompClient.subscribe(
                `/user/queue/heartbeat`,
                () => {
                    this.lastHeartbeatTime = Date.now();
                }
            );
            
            this.eventSubscriptions.set('heartbeat', subscription);
        } catch (error) {
            console.warn('订阅心跳响应失败:', error);
        }
    }

    /**
     * 发送消息
     * @param {string} content - 消息内容
     * @param {string} username - 发送者用户名
     * @param {string} messageType - 消息类型，默认为'CHAT'
     * @param {boolean} queueIfDisconnected - 断连时是否加入队列
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendMessage(content, username, messageType = 'CHAT', queueIfDisconnected = true) {
        // 内容验证
        if (!content?.trim()) {
            console.warn('消息内容不能为空');
            return false;
        }

        // 连接状态检查
        if (!this.stompClient || !this.stompClient.connected || !this.currentRoomId) {
            if (queueIfDisconnected) {
                // 加入消息队列
                const queuedMessage = {
                    content: content.trim(),
                    username: username,
                    messageType: messageType,
                    timestamp: Date.now()
                };
                
                this.messageQueue.push(queuedMessage);
                console.log('消息已加入队列，等待重连后发送:', queuedMessage);
                
                // 如果连接已断开但未开始重连，触发重连
                if (!this.isConnecting && this.isAutoReconnectEnabled) {
                    this._attemptReconnect(this.currentRoomId, this.currentUsername);
                }
                
                return true;
            } else {
                console.error('WebSocket未连接，无法发送消息');
                return false;
            }
        }

        const chatMessage = {
            senderName: username,
            content: content.trim(),
            messageType: messageType,
            timestamp: new Date().toISOString()
        };

        try {
            this.stompClient.send(`/app/chat/${this.currentRoomId}/sendMessage`, {}, JSON.stringify(chatMessage));
            
            // 发送成功事件
            this._emit('message_sent', chatMessage);
            
            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            
            // 发送失败事件
            this._emit('message_send_failed', {
                message: chatMessage,
                error: error
            });
            
            // 如果是临时错误，加入队列
            if (queueIfDisconnected) {
                chatMessage.timestamp = Date.now();
                this.messageQueue.push(chatMessage);
                console.log('发送失败，消息已加入队列:', chatMessage);
                return true;
            }
            
            return false;
        }
    }

    /**
     * 发送用户加入消息
     * @param {string} username - 用户名
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendJoinMessage(username) {
        if (!this.stompClient || !this.stompClient.connected || !this.currentRoomId) {
            console.error('WebSocket未连接，无法发送加入消息');
            return false;
        }

        try {
            this.stompClient.send(`/app/chat/${this.currentRoomId}/addUser`, {}, JSON.stringify({
                senderName: username,
                messageType: 'JOIN',
                timestamp: new Date().toISOString()
            }));
            
            this._emit('join_message_sent', { username: username });
            return true;
        } catch (error) {
            console.error('发送加入消息失败:', error);
            this._emit('message_send_failed', {
                type: 'join',
                error: error
            });
            return false;
        }
    }
    
    /**
     * 发送用户离开消息
     * @param {string} username - 用户名
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendLeaveMessage(username) {
        if (!this.stompClient || !this.stompClient.connected || !this.currentRoomId) {
            return false;
        }

        try {
            this.stompClient.send(`/app/chat/${this.currentRoomId}/leaveUser`, {}, JSON.stringify({
                senderName: username,
                messageType: 'LEAVE',
                timestamp: new Date().toISOString()
            }));
            
            this._emit('leave_message_sent', { username: username });
            return true;
        }
        catch (error) {
            console.error('发送离开消息失败:', error);
            this._emit('message_send_failed', {
                type: 'leave',
                error: error
            });
            return false;
        }
    }
    
    /**
     * 发送用户正在输入的指示
     * @param {string} username - 用户名
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendTypingIndicator(username) {
        if (!this.stompClient || !this.stompClient.connected || !this.currentRoomId) {
            console.error('WebSocket未连接，无法发送输入指示');
            return false;
        }

        try {
            this.stompClient.send(`/app/chat/${this.currentRoomId}/typing`, {}, JSON.stringify({
                senderName: username,
                messageType: 'TYPING',
                timestamp: new Date().toISOString()
            }));
            
            return true;
        }
        catch (error) {
            console.error('发送输入指示失败:', error);
            return false;
        }
    }
    
    /**
     * 清除用户正在输入的指示
     * @param {string} username - 用户名
     * @returns {Promise<boolean>} 是否发送成功
     */
    async clearTypingIndicator(username) {
        if (!this.stompClient || !this.stompClient.connected || !this.currentRoomId) {
            return false;
        }

        try {
            this.stompClient.send(`/app/chat/${this.currentRoomId}/stopTyping`, {}, JSON.stringify({
                senderName: username,
                messageType: 'STOP_TYPING',
                timestamp: new Date().toISOString()
            }));
            
            return true;
        }
        catch (error) {
            console.error('清除输入指示失败:', error);
            return false;
        }
    }

    /**
     * 处理接收到的消息
     * @private
     */
    _handleMessage(message) {
        // 更新最后活跃时间（用于心跳检测）
        this.lastHeartbeatTime = Date.now();
        
        // 调用回调函数
        this._callCallbacks(this.messageCallbacks, message);
        
        // 触发事件
        this._emit('message_received', message);
    }
    
    /**
     * 启动心跳检测
     * @private
     */
    _startHeartbeatMonitoring() {
        // 停止之前的心跳检测
        this._stopHeartbeatMonitoring();
        
        // 设置上次心跳时间
        this.lastHeartbeatTime = Date.now();
        
        // 启动心跳检测间隔
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
            
            // 检查是否超时
            if (timeSinceLastHeartbeat > this.heartbeatTimeout) {
                console.warn(`心跳超时: ${timeSinceLastHeartbeat}ms > ${this.heartbeatTimeout}ms`);
                
                // 触发超时事件
                this._emit('heartbeat_timeout', { 
                    lastHeartbeat: new Date(this.lastHeartbeatTime).toISOString(),
                    timeout: this.heartbeatTimeout 
                });
                
                // 断开连接并尝试重连
                if (this.isAutoReconnectEnabled && !this.isConnecting) {
                    this._cleanupConnection();
                    this._attemptReconnect(this.currentRoomId, this.currentUsername);
                }
            }
        }, 5000); // 每5秒检查一次
    }
    
    /**
     * 停止心跳检测
     * @private
     */
    _stopHeartbeatMonitoring() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 调用回调函数列表
     * @private
     */
    _callCallbacks(callbacks, data) {
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('回调函数执行失败:', error);
            }
        });
    }
    
    /**
     * 发送队列中的消息
     * @private
     */
    _sendQueuedMessages() {
        if (!this.stompClient || !this.stompClient.connected || !this.currentRoomId) {
            return;
        }
        
        console.log(`正在发送队列中的 ${this.messageQueue.length} 条消息`);
        
        // 创建一个副本，避免在发送过程中修改原数组
        const messagesToSend = [...this.messageQueue];
        this.messageQueue = [];
        
        messagesToSend.forEach(async (message) => {
            try {
                const chatMessage = {
                    senderName: message.username,
                    content: message.content,
                    messageType: message.messageType,
                    timestamp: new Date().toISOString(),
                    isQueuedMessage: true
                };
                
                this.stompClient.send(`/app/chat/${this.currentRoomId}/sendMessage`, {}, JSON.stringify(chatMessage));
                
                console.log('队列消息发送成功:', message.content.substring(0, 20) + (message.content.length > 20 ? '...' : ''));
                
                // 发送成功事件
                this._emit('queued_message_sent', chatMessage);
            } catch (error) {
                console.error('队列消息发送失败，重新加入队列:', error);
                
                // 如果发送失败，将消息重新加入队列
                this.messageQueue.push(message);
                
                // 发送失败事件
                this._emit('queued_message_failed', {
                    message: message,
                    error: error
                });
            }
        });
    }
    
    /**
     * 清除所有订阅
     * @private
     */
    _clearSubscriptions() {
        this.eventSubscriptions.forEach((subscription, key) => {
            try {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
            } catch (error) {
                console.error(`取消订阅 ${key} 失败:`, error);
            }
        });
        
        this.eventSubscriptions.clear();
    }
    
    /**
     * 清除所有事件监听器和回调函数
     */
    clearAllListeners() {
        try {
            // 清除所有事件订阅
            this._clearSubscriptions();
            
            // 清空所有回调数组
            this.connectionCallbacks = [];
            this.disconnectionCallbacks = [];
            this.messageCallbacks = [];
            this.errorCallbacks = [];
            
            console.log('WebSocketManager: 所有事件监听器已清除');
        } catch (error) {
            console.error('清除事件监听器时发生错误:', error);
        }
    }
    
    /**
     * 事件订阅系统
     */
    
    /**
     * 订阅事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅的函数
     */
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            console.error('回调必须是函数');
            return () => {};
        }
        
        if (!this.eventSubscriptions.has(eventName)) {
            this.eventSubscriptions.set(eventName, new Set());
        }
        
        const callbacks = this.eventSubscriptions.get(eventName);
        callbacks.add(callback);
        
        // 返回取消订阅的函数
        return () => {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.eventSubscriptions.delete(eventName);
            }
        };
    }
    
    /**
     * 触发事件
     * @private
     * @param {string} eventName - 事件名称
     * @param {*} data - 事件数据
     */
    _emit(eventName, data) {
        if (this.eventSubscriptions.has(eventName)) {
            const callbacks = this.eventSubscriptions.get(eventName);
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件 ${eventName} 回调执行失败:`, error);
                }
            });
        }
    }

    /**
     * 添加连接成功回调
     * @param {Function} callback - 回调函数
     * @returns {number} 回调ID，用于移除
     * @deprecated 使用on('connected', callback)替代
     */
    onConnect(callback) {
        if (typeof callback === 'function') {
            this.connectionCallbacks.push(callback);
            return this.connectionCallbacks.length - 1;
        }
        return -1;
    }

    /**
     * 添加断开连接回调
     * @param {Function} callback - 回调函数
     * @returns {number} 回调ID，用于移除
     * @deprecated 使用on('disconnected', callback)替代
     */
    onDisconnect(callback) {
        if (typeof callback === 'function') {
            this.disconnectionCallbacks.push(callback);
            return this.disconnectionCallbacks.length - 1;
        }
        return -1;
    }

    /**
     * 添加消息接收回调
     * @param {Function} callback - 回调函数
     * @returns {number} 回调ID，用于移除
     * @deprecated 使用on('message_received', callback)替代
     */
    onMessage(callback) {
        if (typeof callback === 'function') {
            this.messageCallbacks.push(callback);
            return this.messageCallbacks.length - 1;
        }
        return -1;
    }
    
    /**
     * 添加错误回调
     * @param {Function} callback - 回调函数
     * @returns {number} 回调ID，用于移除
     */
    onError(callback) {
        if (typeof callback === 'function') {
            this.errorCallbacks.push(callback);
            return this.errorCallbacks.length - 1;
        }
        return -1;
    }

    /**
     * 移除连接成功回调
     * @param {number} id - 回调ID
     */
    removeConnectCallback(id) {
        if (id >= 0 && id < this.connectionCallbacks.length) {
            this.connectionCallbacks.splice(id, 1);
        }
    }

    /**
     * 移除断开连接回调
     * @param {number} id - 回调ID
     */
    removeDisconnectCallback(id) {
        if (id >= 0 && id < this.disconnectionCallbacks.length) {
            this.disconnectionCallbacks.splice(id, 1);
        }
    }

    /**
     * 移除消息接收回调
     * @param {number} id - 回调ID
     */
    removeMessageCallback(id) {
        if (id >= 0 && id < this.messageCallbacks.length) {
            this.messageCallbacks.splice(id, 1);
        }
    }

    /**
     * 获取连接状态
     * @returns {boolean} 是否已连接
     */
    isConnected() {
        return this.stompClient !== null && this.stompClient.connected;
    }

    /**
     * 获取当前房间ID
     * @returns {number|null} 当前房间ID
     */
    getCurrentRoomId() {
        return this.currentRoomId;
    }
    
    /**
     * 获取当前用户名
     * @returns {string|null} 当前用户名
     */
    getCurrentUsername() {
        return this.currentUsername;
    }

    /**
     * 设置最大重连次数
     * @param {number} attempts - 最大重连次数
     */
    setMaxReconnectAttempts(attempts) {
        this.maxReconnectAttempts = attempts;
    }

    /**
     * 设置重连延迟
     * @param {number} delay - 重连延迟（毫秒）
     */
    setReconnectDelay(delay) {
        this.reconnectDelay = delay;
        this.baseReconnectDelay = delay;
    }
    
    /**
     * 启用/禁用自动重连
     * @param {boolean} enabled - 是否启用
     */
    setAutoReconnect(enabled) {
        this.isAutoReconnectEnabled = enabled;
    }
    
    /**
     * 获取消息队列大小
     * @returns {number} 队列中的消息数量
     */
    getMessageQueueSize() {
        return this.messageQueue.length;
    }
    
    /**
     * 清空消息队列
     */
    clearMessageQueue() {
        this.messageQueue = [];
    }
    
    /**
     * 获取重连状态
     * @returns {Object} 重连状态信息
     */
    getReconnectStatus() {
        return {
            attempts: this.reconnectAttempts,
            maxAttempts: this.maxReconnectAttempts,
            delay: this.reconnectDelay,
            isEnabled: this.isAutoReconnectEnabled
        };
    }
    
    /**
     * 重置重连尝试次数
     */
    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }
    
    /**
     * 检查连接健康状态
     * @returns {Object} 连接健康状态
     */
    getConnectionHealth() {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - this.lastHeartbeatTime;
        const isHealthy = timeSinceLastHeartbeat < this.heartbeatTimeout;
        
        return {
            isHealthy: isHealthy,
            lastHeartbeatTime: new Date(this.lastHeartbeatTime).toISOString(),
            timeSinceLastHeartbeat: timeSinceLastHeartbeat,
            isConnected: this.isConnected(),
            isConnecting: this.isConnecting,
            isConnectionBroken: this.isConnectionBroken
        };
    }
    
    /**
     * 发送ping消息（用于主动检查连接）
     * @returns {Promise<boolean>} 是否发送成功
     */
    async ping() {
        if (!this.stompClient || !this.stompClient.connected) {
            return false;
        }
        
        try {
            this.stompClient.send(`/app/ping`, {}, JSON.stringify({
                timestamp: Date.now()
            }));
            return true;
        } catch (error) {
            console.error('发送ping消息失败:', error);
            return false;
        }
    }
    
    /**
     * 切换房间
     * @param {number} newRoomId - 新房间ID
     * @returns {Promise<boolean>} 是否切换成功
     */
    async switchRoom(newRoomId) {
        if (!this.stompClient || !this.stompClient.connected) {
            console.error('WebSocket未连接，无法切换房间');
            return false;
        }
        
        try {
            // 先取消订阅当前房间
            const currentSubscription = this.eventSubscriptions.get(`room_${this.currentRoomId}`);
            if (currentSubscription) {
                currentSubscription.unsubscribe();
                this.eventSubscriptions.delete(`room_${this.currentRoomId}`);
            }
            
            // 记录旧房间ID
            const oldRoomId = this.currentRoomId;
            this.currentRoomId = newRoomId;
            
            // 订阅新房间
            this._subscribeToRoomMessages(newRoomId);
            
            // 通知服务器用户加入新房间
            await this.sendJoinMessage(this.currentUsername);
            
            console.log(`已从房间 ${oldRoomId} 切换到房间 ${newRoomId}`);
            this._emit('room_switched', { oldRoomId: oldRoomId, newRoomId: newRoomId });
            
            return true;
        } catch (error) {
            console.error('切换房间失败:', error);
            this._emit('error', { type: 'room_switch', error: error });
            return false;
        }
    }
}

// 创建单例实例
export const webSocketManager = new WebSocketManager();