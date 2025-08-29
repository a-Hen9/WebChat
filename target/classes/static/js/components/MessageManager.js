/**
 * MessageManager - 处理消息显示和格式化功能
 */
class MessageManager {
    constructor(currentUsername) {
        this.currentUsername = currentUsername;
        this.messageLimit = 500; // 消息显示上限
        this.isLoading = false; // 加载状态
        this.lastMessageId = null; // 最后一条消息ID，用于分页加载
    }

    /**
     * 格式化时间
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的时间字符串 HH:MM
     */
    formatTime(dateString) {
        const date = dateString ? new Date(dateString) : new Date();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    /**
     * 格式化完整日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期字符串 YYYY-MM-DD
     */
    formatDate(dateString) {
        const date = dateString ? new Date(dateString) : new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * 获取用户名首字母作为头像
     * @param {string} username - 用户名
     * @returns {string} 用户名的首字母
     */
    getAvatarText(username) {
        if (!username) return '?';
        return username.charAt(0).toUpperCase();
    }
    
    /**
     * 获取消息唯一ID
     * @param {Object} message - 消息对象
     * @returns {string} 唯一ID
     */
    getMessageId(message) {
        return `${message.senderName}_${message.createdAt}`;
    }

    /**
     * 生成用户头像的背景色
     * @param {string} username - 用户名
     * @returns {string} 十六进制颜色代码
     */
    getAvatarColor(username) {
        if (!username) return '#667eea';
        
        // 根据用户名生成固定颜色
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // 将hash值转换为RGB颜色
        const color = ((hash & 0x00FFFFFF).toString(16)).padStart(6, '0');
        return `#${color}`;
    }

    /**
     * 显示消息
     * @param {Object} message - 消息对象
     * @param {string} message.senderName - 发送者名称
     * @param {string} message.content - 消息内容
     * @param {string} message.messageType - 消息类型 (CHAT, JOIN, LEAVE, SYSTEM)
     * @param {string} message.createdAt - 创建时间
     * @param {boolean} isHistory - 是否为历史消息
     */
    showMessage(message, isHistory = false) {
        const messagesDiv = $('#messages');
        const timestamp = this.formatTime(message.createdAt);
        
        // 检查消息是否重复
        const messageId = this.getMessageId(message);
        if ($(`#message-${messageId}`).length > 0) {
            return;
        }
        
        // 检查是否需要显示日期分隔符
        this._checkAndShowDateSeparator(message.createdAt);
        
        if (message.messageType === 'JOIN' || message.messageType === 'LEAVE' || message.messageType === 'SYSTEM') {
            // 系统消息
            this._showSystemMessage(message, timestamp, isHistory);
        } else {
            // 普通聊天消息
            this._showChatMessage(message, timestamp, isHistory);
        }
        
        // 限制消息数量
        this._limitMessageCount();
        
        // 只有新消息才滚动到底部
        if (!isHistory) {
            this.scrollToBottom();
        }
    }
    
    /**
     * 显示正在发送的消息
     * @param {Object} message - 消息对象
     * @param {string} message.id - 消息ID
     * @param {string} message.sender - 发送者名称
     * @param {string} message.content - 消息内容
     * @param {string} message.timestamp - 时间戳
     * @param {string} message.status - 消息状态
     */
    showSendingMessage(message) {
        const messagesDiv = $('#messages');
        const timestamp = this.formatTime(message.timestamp);
        const avatarText = this.getAvatarText(message.sender);
        const avatarColor = this.getAvatarColor(message.sender);
        
        // 为消息内容添加链接高亮和其他格式化
        const formattedContent = this._formatMessageContent(message.content);
        
        const date = this.formatDate(message.timestamp);
        
        const messageElement = $(`
            <div id="message-${message.id}" class="message-container sent" data-date="${date}">
                <div class="avatar" style="background: linear-gradient(135deg, ${avatarColor} 0%, #764ba2 100%);" title="${message.sender}">${avatarText}</div>
                <div class="message-content">
                    <div class="message-sender">我</div>
                    <div class="message-bubble sent sending">
                        ${formattedContent}
                        <div class="message-status">
                            <span class="sending-indicator"><div class="typing-dots"><span></span><span></span><span></span></div></span>
                        </div>
                    </div>
                    <div class="message-time">${timestamp}</div>
                </div>
            </div>
        `);
        
        // 添加淡入动画
        messageElement.css({ opacity: 0, transform: 'translateX(20px)' });
        messagesDiv.append(messageElement);
        
        // 执行动画
        setTimeout(() => {
            messageElement.animate({ opacity: 1, transform: 'translateX(0)' }, 300);
        }, 10);
        
        this.scrollToBottom();
    }
    
    /**
     * 检查并显示日期分隔符
     * @private
     */
    _checkAndShowDateSeparator(dateString) {
        const messagesDiv = $('#messages');
        const currentDate = this.formatDate(dateString);
        
        // 获取最后一条消息的日期
        const lastMessage = messagesDiv.find('.message-container, .message-system').last();
        let lastMessageDate = null;
        
        if (lastMessage.length > 0) {
            // 从数据属性获取日期
            lastMessageDate = lastMessage.data('date');
        }
        
        // 如果没有历史消息或日期不同，则显示日期分隔符
        if (!lastMessageDate || lastMessageDate !== currentDate) {
            // 格式化日期为更友好的显示方式
            const formattedDate = this._formatFriendlyDate(currentDate);
            const dateSeparator = `
                <div class="date-separator" data-date="${currentDate}">
                    <span>${formattedDate}</span>
                </div>
            `;
            messagesDiv.append(dateSeparator);
        }
    }
    
    /**
     * 格式化友好的日期显示
     * @private
     */
    _formatFriendlyDate(dateString) {
        const today = new Date();
        const date = new Date(dateString);
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            // 返回星期几
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            return weekdays[date.getDay()];
        } else {
            return dateString;
        }
    }
    
    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const messagesDiv = $('#messages');
        // 添加平滑滚动
        messagesDiv.animate({
            scrollTop: messagesDiv[0].scrollHeight
        }, 300);
    }

    /**
     * 显示系统消息
     * @private
     */
    _showSystemMessage(message, timestamp, isHistory = false) {
        const messagesDiv = $('#messages');
        let content = '';
        let messageClass = '';
        
        if (message.messageType === 'JOIN') {
            content = `<em>${message.senderName} 加入了聊天室</em>`;
            messageClass = 'join-message';
        } else if (message.messageType === 'LEAVE') {
            content = `<em>${message.senderName} 离开了聊天室</em>`;
            messageClass = 'leave-message';
        } else if (message.messageType === 'SYSTEM') {
            content = `<em>${message.content}</em>`;
            messageClass = 'system-message';
        }
        
        const messageId = this.getMessageId(message);
        const date = this.formatDate(message.createdAt);
        
        const messageElement = $(
            `<div id="message-${messageId}" class="message-system ${messageClass}" data-date="${date}">
                ${content}
                <div class="message-time">${timestamp}</div>
            </div>`
        );
        
        if (!isHistory) {
            // 为新消息添加动画
            messageElement.css({ opacity: 0, transform: 'translateY(10px)' });
        }
        
        messagesDiv.append(messageElement);
        
        if (!isHistory) {
            // 执行动画
            setTimeout(() => {
                messageElement.animate({ opacity: 1, transform: 'translateY(0)' }, 300);
            }, 10);
        }
    }

    /**
     * 显示聊天消息
     * @private
     */
    _showChatMessage(message, timestamp, isHistory = false) {
        const messagesDiv = $('#messages');
        const isSent = message.senderName === this.currentUsername;
        const avatarText = this.getAvatarText(message.senderName);
        const avatarColor = this.getAvatarColor(message.senderName);
        
        // 为消息内容添加链接高亮和其他格式化
        const formattedContent = this._formatMessageContent(message.content);
        
        const messageId = this.getMessageId(message);
        const date = this.formatDate(message.createdAt);
        
        const messageElement = $(
            `<div id="message-${messageId}" class="message-container ${isSent ? 'sent' : 'received'}" data-date="${date}">
                <div class="avatar" style="background: linear-gradient(135deg, ${avatarColor} 0%, #764ba2 100%);" title="${message.senderName}">${avatarText}</div>
                <div class="message-content">
                    <div class="message-sender">${isSent ? '我' : message.senderName}</div>
                    <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                        ${formattedContent}
                    </div>
                    <div class="message-time">${timestamp}</div>
                </div>
            </div>`
        );
        
        if (!isHistory) {
            // 为新消息添加动画
            messageElement.css({
                opacity: 0,
                transform: isSent ? 'translateX(20px)' : 'translateX(-20px)'
            });
        }
        
        messagesDiv.append(messageElement);
        
        if (!isHistory) {
            // 执行动画
            setTimeout(() => {
                messageElement.animate({
                    opacity: 1,
                    transform: 'translateX(0)'
                }, 300);
            }, 10);
        }
        
        // 保存最后一条消息ID
        this.lastMessageId = messageId;
    }

    /**
     * 格式化消息内容（如链接高亮等）
     * @private
     */
    _formatMessageContent(content) {
        if (!content) return '';
        
        let formattedContent = content;
        
        // 1. 将URL转换为可点击的链接
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formattedContent = formattedContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="message-link">$1</a>');
        
        // 2. 格式化表情符号
        formattedContent = this._formatEmojis(formattedContent);
        
        // 3. 处理换行
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        
        // 4. 处理粗体文本
        formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 5. 处理斜体文本
        formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // 6. 处理代码块
        formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        return formattedContent;
    }
    
    /**
     * 格式化表情符号
     * @private
     */
    _formatEmojis(content) {
        const emojis = {
            ':smile:': '😊',
            ':laugh:': '😂',
            ':heart:': '❤️',
            ':thumbsup:': '👍',
            ':thumbsdown:': '👎',
            ':wave:': '👋',
            ':thinking:': '🤔',
            ':fire:': '🔥',
            ':ok:': '👌',
            ':love:': '😍',
            ':cool:': '😎',
            ':sad:': '😢',
            ':angry:': '😠',
            ':surprised:': '😲'
        };
        
        let formattedContent = content;
        
        // 替换表情符号文本为实际的emoji
        for (const [text, emoji] of Object.entries(emojis)) {
            const regex = new RegExp(text, 'g');
            formattedContent = formattedContent.replace(regex, emoji);
        }
        
        return formattedContent;
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     * @param {boolean} autoHide - 是否自动隐藏
     */
    showErrorMessage(message, autoHide = true) {
        const messagesDiv = $('#messages');
        const errorMessageId = `error-${Date.now()}`;
        
        const messageElement = $(
            `<div id="${errorMessageId}" class="message-system error-message">
                <em>${message}</em>
            </div>`
        );
        
        // 添加淡入动画
        messageElement.css({ opacity: 0 });
        messagesDiv.append(messageElement);
        
        messageElement.animate({ opacity: 1 }, 300);
        this.scrollToBottom();
        
        // 自动隐藏
        if (autoHide) {
            setTimeout(() => {
                messageElement.animate({ opacity: 0 }, 300, () => {
                    messageElement.remove();
                });
            }, 5000);
        }
        
        return errorMessageId;
    }

    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {boolean} autoHide - 是否自动隐藏
     */
    showSuccessMessage(message, autoHide = true) {
        const messagesDiv = $('#messages');
        const successMessageId = `success-${Date.now()}`;
        
        const messageElement = $(
            `<div id="${successMessageId}" class="message-system success-message">
                <em>${message}</em>
            </div>`
        );
        
        // 添加淡入动画
        messageElement.css({ opacity: 0 });
        messagesDiv.append(messageElement);
        
        messageElement.animate({ opacity: 1 }, 300);
        this.scrollToBottom();
        
        // 自动隐藏
        if (autoHide) {
            setTimeout(() => {
                messageElement.animate({ opacity: 0 }, 300, () => {
                    messageElement.remove();
                });
            }, 3000);
        }
        
        return successMessageId;
    }
    
    /**
     * 显示加载消息
     * @returns {string} 加载消息ID
     */
    showLoadingMessage() {
        if (this.isLoading) return null;
        
        this.isLoading = true;
        const messagesDiv = $('#messages');
        const loadingId = `loading-${Date.now()}`;
        
        const loadingElement = $(
            `<div id="${loadingId}" class="message-system loading-message">
                <em><div class="loading-spinner"></div>加载中...</em>
            </div>`
        );
        
        messagesDiv.append(loadingElement);
        this.scrollToBottom();
        
        return loadingId;
    }
    
    /**
     * 隐藏加载消息
     */
    hideLoadingMessage() {
        if (!this.isLoading) return;
        
        this.isLoading = false;
        const loadingElement = $('.loading-message');
        
        if (loadingElement.length > 0) {
            loadingElement.animate({ opacity: 0 }, 300, () => {
                loadingElement.remove();
            });
        }
    }

    /**
     * 清空消息列表
     */
    clearMessages() {
        const messagesDiv = $('#messages');
        
        // 添加淡出动画
        messagesDiv.animate({ opacity: 0 }, 200, () => {
            messagesDiv.empty();
            messagesDiv.animate({ opacity: 1 }, 200);
        });
    }
    
    /**
     * 限制消息数量，防止DOM过多
     * @private
     */
    _limitMessageCount() {
        const messagesDiv = $('#messages');
        const allMessages = messagesDiv.find('.message-container, .message-system');
        
        // 如果消息数量超过限制，移除较旧的消息
        if (allMessages.length > this.messageLimit) {
            const messagesToRemove = allMessages.slice(0, allMessages.length - this.messageLimit);
            messagesToRemove.remove();
        }
    }

    /**
     * 加载历史消息
     * @param {number} roomId - 房间ID
     * @param {number} page - 页码（用于分页加载）
     * @param {number} pageSize - 每页消息数量
     * @returns {Promise}
     */
    loadHistoryMessages(roomId, page = 1, pageSize = 50) {
        return new Promise((resolve, reject) => {
            // 显示加载状态
            this.showLoadingMessage();
            
            // 添加请求参数
            const params = {
                page: page,
                pageSize: pageSize,
                lastMessageId: this.lastMessageId
            };
            
            $.get(`/rooms/${roomId}/messages`, params, (data) => {
                // 隐藏加载状态
                this.hideLoadingMessage();
                
                // 首次加载时清空消息
                if (page === 1) {
                    this.clearMessages();
                }
                
                if (data.length === 0) {
                    if (page === 1) {
                        this.showSuccessMessage('暂无历史消息');
                    } else {
                        this.showSuccessMessage('没有更多历史消息了');
                    }
                } else {
                    // 批量显示历史消息
                    const fragment = document.createDocumentFragment();
                    
                    // 先计算需要添加的所有元素
                    data.forEach((message) => {
                        const messageId = this.getMessageId(message);
                        if ($(`#message-${messageId}`).length === 0) {
                            this.showMessage(message, true);
                        }
                    });
                    
                    // 如果是首次加载，滚动到底部
                    if (page === 1) {
                        this.scrollToBottom();
                    }
                }
                
                resolve(data);
            }).fail((xhr) => {
                // 隐藏加载状态
                this.hideLoadingMessage();
                
                this.showErrorMessage('加载历史消息失败: ' + (xhr.responseText || '未知错误'));
                reject(xhr);
            });
        });
    }
    
    /**
     * 批量添加消息（用于快速加载大量历史消息）
     * @param {Array} messages - 消息数组
     */
    batchAddMessages(messages) {
        if (!Array.isArray(messages)) return;
        
        messages.forEach((message) => {
            this.showMessage(message, true);
        });
        
        this.scrollToBottom();
    }
    
    /**
     * 清除所有事件监听器和回调函数
     */
    clearAllListeners() {
        try {
            console.log('MessageManager: 事件监听器已清除');
        } catch (error) {
            console.error('清除事件监听器时发生错误:', error);
        }
    }
}

export default MessageManager;