/**
 * chat.js - 聊天页面的入口文件
 * 整合所有组件，处理用户交互和页面逻辑
 */

// 导入所需组件
import { authManager } from './components/AuthManager.js';
import { roomManager } from './components/RoomManager.js';
import { webSocketManager } from './components/WebSocketManager.js';
import MessageManager from './components/MessageManager.js';

// 全局变量
let messageManager = null;
let currentUsername = '';

// 事件监听器集合（用于清理）
const eventListeners = new Map();

/**
 * 页面初始化
 */
function init() {
    console.log('开始初始化聊天页面...');
    
    // 显示页面加载动画
    showPageLoading(true);
    
    try {
        // 初始化认证管理
        authManager.initChatPage();
        
        // 获取当前用户后初始化其他组件
        authManager.getCurrentUser()
            .then(username => {
                if (!username) {
                    throw new Error('未获取到用户名');
                }
                
                console.log('当前用户:', username);
                currentUsername = username;
                
                try {
                    // 初始化消息管理器
                    messageManager = new MessageManager(currentUsername);
                    
                    // 初始化房间管理器
                    initRoomManager();
                    
                    // 初始化WebSocket管理器
                    initWebSocketManager();
                    
                    // 初始化消息发送功能
                    initMessageSending();
                    
                    // 添加页面动画效果
                    addPageAnimation();
                    
                    console.log('聊天页面初始化完成');
                } catch (error) {
                    console.error('组件初始化失败:', error);
                    if (messageManager) {
                        messageManager.showErrorMessage(`组件初始化失败: ${error.message || '未知错误'}`);
                    }
                } finally {
                    // 隐藏页面加载动画
                    setTimeout(() => {
                        showPageLoading(false);
                    }, 500);
                }
            })
            .catch(error => {
                console.error('获取用户信息失败:', error);
                
                // 隐藏页面加载动画
                showPageLoading(false);
                
                // 显示错误消息并跳转回登录页
                alert('获取用户信息失败，请重新登录');
                window.location.href = '/';
            });
    } catch (error) {
        console.error('初始化过程中发生未捕获错误:', error);
        
        // 隐藏页面加载动画
        showPageLoading(false);
        
        // 显示错误消息并跳转回登录页
        setTimeout(() => {
            alert('页面初始化失败，请重新登录');
            window.location.href = '/';
        }, 500);
    }
}

/**
 * 显示或隐藏页面加载动画
 * @param {boolean} show - 是否显示加载动画
 */
function showPageLoading(show) {
    const loadingElement = $('#page-loading');
    if (loadingElement.length === 0) {
        // 如果加载元素不存在，则创建一个
        const loadingHTML = `
            <div id="page-loading" class="page-loading-overlay">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <div class="loading-text">加载中...</div>
                </div>
            </div>
        `;
        $('body').append(loadingHTML);
    }
    
    const overlay = $('#page-loading');
    if (show) {
        overlay.show();
    } else {
        overlay.fadeOut(300, () => {
            overlay.hide();
        });
    }
}

/**
 * 初始化房间管理器
 */
function initRoomManager() {
    // 加载房间列表
    roomManager.loadRooms();
    
    // 初始化房间创建表单
    roomManager.initCreateRoomForm((newRoom) => {
        // 创建成功后自动加入新房间
        joinRoom(newRoom.id);
    });

    // 添加房间更新监听
    roomManager.onRoomUpdate((rooms) => {
        console.log('房间列表已更新:', rooms);
        // 可以在这里添加额外的房间更新处理逻辑
    });
}

/**
 * 初始化WebSocket管理器
 */
function initWebSocketManager() {
    // 设置重连参数
    webSocketManager.setMaxReconnectAttempts(5);
    webSocketManager.setReconnectDelay(1500);
    webSocketManager.setAutoReconnect(true);
    
    // 使用新的事件订阅系统
    
    // 消息接收
    eventListeners.set('message_received', webSocketManager.on('message_received', (message) => {
        messageManager.showMessage(message);
    }));
    
    // 连接成功
    eventListeners.set('connected', webSocketManager.on('connected', (data) => {
        const { roomId, username } = data;
        console.log('已连接到房间:', roomId);
        
        // 显示连接成功消息
        messageManager.showSuccessMessage('连接成功，欢迎回来！');
        
        // 发送用户加入消息
        webSocketManager.sendJoinMessage(username);
        
        // 加载历史消息
        messageManager.loadHistoryMessages(roomId);
        
        // 发送队列中的消息
        if (webSocketManager.getMessageQueueSize() > 0) {
            messageManager.showSuccessMessage(`正在发送 ${webSocketManager.getMessageQueueSize()} 条未发送的消息`);
            webSocketManager._sendQueuedMessages();
        }
    }));
    
    // 连接断开
    eventListeners.set('disconnected', webSocketManager.on('disconnected', (data) => {
        const { reason } = data;
        console.log('WebSocket连接已断开:', reason);
        
        let message = '连接已断开';
        if (reason === 'manual_disconnect') {
            message = '已离开聊天室';
        } else if (reason === 'reconnect_failed') {
            message = '连接已断开，尝试重连失败，请刷新页面重试';
        }
        
        messageManager.showErrorMessage(message);
    }));
    
    // 重连尝试
    eventListeners.set('reconnect_attempt', webSocketManager.on('reconnect_attempt', (data) => {
        const { attempt, maxAttempts, delay } = data;
        console.log(`尝试重连 (${attempt}/${maxAttempts})... 延迟: ${delay}ms`);
        
        messageManager.showSuccessMessage(`正在尝试重连 (${attempt}/${maxAttempts})...`);
    }));
    
    // 重连成功
    eventListeners.set('reconnected', webSocketManager.on('reconnected', (data) => {
        console.log('重连成功:', data);
        
        messageManager.showSuccessMessage('重连成功！');
        
        // 重新加载历史消息
        messageManager.loadHistoryMessages(data.roomId);
        
        // 发送队列中的消息
        if (webSocketManager.getMessageQueueSize() > 0) {
            messageManager.showSystemMessage({
                messageType: 'SYSTEM',
                content: `正在发送 ${webSocketManager.getMessageQueueSize()} 条未发送的消息`
            });
            webSocketManager._sendQueuedMessages();
        }
    }));
    
    // 心跳超时
    eventListeners.set('heartbeat_timeout', webSocketManager.on('heartbeat_timeout', (data) => {
        console.warn('心跳超时:', data);
        
        messageManager.showErrorMessage('连接不稳定，正在检查...');
    }));
    
    // 消息发送成功
    eventListeners.set('message_sent', webSocketManager.on('message_sent', (message) => {
        // 这里可以添加消息发送成功的处理逻辑
        console.log('消息发送成功:', message.content.substring(0, 20) + '...');
    }));
    
    // 消息发送失败
    eventListeners.set('message_send_failed', webSocketManager.on('message_send_failed', (data) => {
        console.error('消息发送失败:', data.error);
        
        if (data.message) {
            messageManager.showErrorMessage(`发送消息失败: ${data.error?.message || '未知错误'}`);
        }
    }));
    
    // 系统通知
    eventListeners.set('notification', webSocketManager.on('notification', (notification) => {
        if (notification.severity === 'warning' || notification.severity === 'error') {
            messageManager.showErrorMessage(notification.content);
        } else {
            messageManager.showSuccessMessage(notification.content);
        }
    }));
    
    // 错误处理
    eventListeners.set('error', webSocketManager.on('error', (error) => {
        console.error('WebSocket错误:', error);
        
        let errorMessage = '发生错误';
        if (error.type === 'connection') {
            errorMessage = `连接错误: ${error.message}`;
        } else if (error.type === 'message_parse') {
            errorMessage = '消息解析错误';
        }
        
        messageManager.showErrorMessage(errorMessage);
    }));
    
    // 房间切换
    eventListeners.set('room_switched', webSocketManager.on('room_switched', (data) => {
        console.log(`已从房间 ${data.oldRoomId} 切换到房间 ${data.newRoomId}`);
        
        messageManager.clearMessages();
        messageManager.loadHistoryMessages(data.newRoomId);
    }));
}

/**
 * 初始化消息发送功能
 */
function initMessageSending() {
    const messageInput = $('#messageInput');
    const sendButton = $('#sendButton');
    
    // 绑定发送按钮事件
    const sendButtonClickHandler = () => sendMessage();
    sendButton.click(sendButtonClickHandler);
    eventListeners.set('sendButtonClick', { element: sendButton, event: 'click', handler: sendButtonClickHandler });
    
    // 绑定回车键发送
    const keyPressHandler = (e) => {
        if (e.which === 13 && !e.shiftKey) { // Enter键，且不按住Shift
            e.preventDefault();
            sendMessage();
        }
    };
    messageInput.keypress(keyPressHandler);
    eventListeners.set('messageInputKeyPress', { element: messageInput, event: 'keypress', handler: keyPressHandler });
    
    // 添加输入框焦点监听
    const focusHandler = function() {
        // 输入框获得焦点时的样式变化
        $(this).addClass('focused');
        // 通知其他用户当前正在输入
        if (webSocketManager.isConnected()) {
            webSocketManager.sendTypingIndicator(currentUsername);
        }
    };
    const blurHandler = function() {
        // 输入框失去焦点时的样式变化
        $(this).removeClass('focused');
        // 清除输入指示器
        if (webSocketManager.isConnected()) {
            webSocketManager.clearTypingIndicator(currentUsername);
        }
    };
    messageInput.on('focus', focusHandler);
    messageInput.on('blur', blurHandler);
    eventListeners.set('messageInputFocus', { element: messageInput, event: 'focus', handler: focusHandler });
    eventListeners.set('messageInputBlur', { element: messageInput, event: 'blur', handler: blurHandler });
    
    // 添加输入事件监听，用于更新发送按钮状态
    const inputHandler = function() {
        const content = $(this).val().trim();
        sendButton.prop('disabled', !content || !webSocketManager.isConnected());
    };
    messageInput.on('input', inputHandler);
    eventListeners.set('messageInput', { element: messageInput, event: 'input', handler: inputHandler });
    
    // 初始禁用发送按钮
    inputHandler.call(messageInput[0]);
    
    // 添加快捷键支持
    const keydownHandler = (e) => {
        // Ctrl+Enter或Cmd+Enter在保持Shift的情况下可以换行
        if ((e.ctrlKey || e.metaKey) && e.which === 13) {
            e.preventDefault();
            // 模拟插入换行符
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            this.value = value.substring(0, start) + '\n' + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }
    };
    messageInput.on('keydown', keydownHandler);
    eventListeners.set('messageInputKeyDown', { element: messageInput, event: 'keydown', handler: keydownHandler });
}

/**
 * 发送消息
 */
async function sendMessage() {
    const messageInput = $('#messageInput');
    const sendButton = $('#sendButton');
    const messageContent = messageInput.val().trim();
    
    if (!messageContent) {
        return;
    }
    
    // 检查连接状态
    if (!webSocketManager.isConnected()) {
        // 显示连接提示
        messageManager.showErrorMessage('连接未建立，请等待重连或刷新页面');
        return;
    }
    
    // 禁用发送按钮和输入框防止重复发送
    sendButton.prop('disabled', true);
    messageInput.prop('disabled', true);
    
    try {
        // 生成唯一消息ID
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 清空输入框
        messageInput.val('');
        
        // 显示发送中的消息状态
        messageManager.showSendingMessage({
            id: messageId,
            sender: currentUsername,
            content: messageContent,
            timestamp: new Date().toISOString(),
            status: 'sending'
        });
        
        // 添加消息发送状态监听
        const messageSentHandler = (sentMessage) => {
            if (sentMessage.senderName === currentUsername && sentMessage.content === messageContent) {
                messageManager.updateMessageStatus(messageId, 'sent');
                // 移除临时监听器
                webSocketManager.off('message_sent', messageSentHandler);
            }
        };
        
        const messageFailedHandler = (data) => {
            if (data.message && data.message.senderName === currentUsername && data.message.content === messageContent) {
                messageManager.updateMessageStatus(messageId, 'failed');
                messageManager.showErrorMessage(`发送消息失败: ${data.error?.message || '未知错误'}`);
                // 移除临时监听器
                webSocketManager.off('message_send_failed', messageFailedHandler);
            }
        };
        
        webSocketManager.on('message_sent', messageSentHandler);
        webSocketManager.on('message_send_failed', messageFailedHandler);
        
        // 保存临时监听器以便清理
        eventListeners.set(`messageSent_${messageId}`, { handler: messageSentHandler });
        eventListeners.set(`messageFailed_${messageId}`, { handler: messageFailedHandler });
        
        // 异步发送消息
        const sendResult = await webSocketManager.sendMessage(messageContent, currentUsername);
        
        if (!sendResult) {
            messageManager.updateMessageStatus(messageId, 'failed');
            messageManager.showErrorMessage('发送消息失败，请重试');
        }
    } catch (error) {
        console.error('发送消息时发生错误:', error);
        messageManager.showErrorMessage(`发送消息时发生错误: ${error.message || '未知错误'}`);
    } finally {
        // 重新启用发送按钮和输入框
        setTimeout(() => {
            sendButton.prop('disabled', false);
            messageInput.prop('disabled', false);
            messageInput.focus();
        }, 300);
    }
}

/**
 * 加入房间
 * @param {number} roomId - 房间ID
 */
function joinRoom(roomId) {
    console.log(`[joinRoom] 尝试加入房间，房间ID: ${roomId}`);
    
    // 验证房间ID
    if (!roomId || typeof roomId !== 'number') {
        console.error('无效的房间ID:', roomId);
        if (messageManager) {
            messageManager.showErrorMessage('无效的房间ID');
        }
        return Promise.reject(new Error('无效的房间ID'));
    }
    
    // 显示加载指示器
    if (messageManager) {
        messageManager.showLoadingMessage();
    }
    
    // 首先通过房间管理器加入房间
    return roomManager.joinRoom(roomId)
        .then((room) => {
            console.log(`[joinRoom] 成功获取房间信息:`, room);
            return room;
        })
        .then(() => {
            // 清空消息区域
            messageManager.clearMessages();
            
            // 显示连接中提示
            messageManager.showSuccessMessage('正在连接聊天室...');
            
            // 断开当前的WebSocket连接（如果存在）
            console.log(`[joinRoom] 检查当前WebSocket连接状态: ${webSocketManager.isConnected() ? '已连接' : '未连接'}`);
            if (webSocketManager.isConnected()) {
                console.log(`[joinRoom] 断开当前WebSocket连接，准备切换房间`);
                webSocketManager.disconnect('room_switch');
            }
            
            // 然后通过WebSocket管理器连接新房间
            console.log(`[joinRoom] 尝试建立新的WebSocket连接，房间ID: ${roomId}，用户名: ${currentUsername}`);
            return webSocketManager.connect(roomId, currentUsername, true);
        })
        .catch(error => {
            console.error('加入房间失败:', error);
            console.log(`[joinRoom] 错误详情:`, error);
            if (error instanceof Error) {
                console.log(`[joinRoom] 错误堆栈:`, error.stack);
            }
            if (messageManager) {
                messageManager.showErrorMessage('加入房间失败: ' + (error?.message || error));
            }
            return Promise.reject(error);
        })
        .finally(() => {
            // 隐藏加载指示器
            if (messageManager) {
                setTimeout(() => {
                    messageManager.hideLoadingMessage();
                }, 500);
            }
        });
}

/**
 * 添加页面动画效果
 */
function addPageAnimation() {
    // 防止重复添加动画效果
    if (window.pageAnimationsInitialized) {
        console.log('页面动画已初始化');
        return;
    }
    window.pageAnimationsInitialized = true;
    
    // 房间列表项悬停效果
    const roomItemMouseEnterHandler = function() {
        $(this).css({
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        });
    };
    
    const roomItemMouseLeaveHandler = function() {
        if (!$(this).hasClass('active')) {
            $(this).css({
                transform: 'translateY(0)',
                boxShadow: 'none'
            });
        }
    };
    
    $(document).on('mouseenter', '.room-item', roomItemMouseEnterHandler);
    $(document).on('mouseleave', '.room-item', roomItemMouseLeaveHandler);
    
    // 保存事件监听器引用
    eventListeners.set('roomItemMouseEnter', { event: 'mouseenter', selector: '.room-item', handler: roomItemMouseEnterHandler });
    eventListeners.set('roomItemMouseLeave', { event: 'mouseleave', selector: '.room-item', handler: roomItemMouseLeaveHandler });
    
    // 添加元素淡入动画
    const fadeInElements = function() {
        const elements = [
            '.chat-container',
            '.room-list',
            '.message-input-container',
            '#header'
        ];
        
        elements.forEach((selector, index) => {
            setTimeout(() => {
                const element = $(selector);
                if (element.length > 0) {
                    element.css({
                        opacity: '0',
                        transform: 'translateY(10px)'
                    }).animate({
                        opacity: '1',
                        transform: 'translateY(0)'
                    }, 500);
                }
            }, 100 * index);
        });
    };
    
    // 延迟执行淡入动画
    setTimeout(fadeInElements, 300);
    
    // 添加按钮悬停效果
    const buttonHoverHandler = function() {
        $(this).animate({
            opacity: '0.85',
            transform: 'scale(1.03)'
        }, 150);
    };
    
    const buttonLeaveHandler = function() {
        $(this).animate({
            opacity: '1',
            transform: 'scale(1)'
        }, 150);
    };
    
    $(document).on('mouseenter', 'button:not(:disabled)', buttonHoverHandler);
    $(document).on('mouseleave', 'button:not(:disabled)', buttonLeaveHandler);
    
    // 保存按钮事件监听器
    eventListeners.set('buttonHover', { event: 'mouseenter', selector: 'button:not(:disabled)', handler: buttonHoverHandler });
    eventListeners.set('buttonLeave', { event: 'mouseleave', selector: 'button:not(:disabled)', handler: buttonLeaveHandler });
    
    // 滚动条美化
    customizeScrollbar();
}

/**
 * 自定义滚动条样式
 */
function customizeScrollbar() {
    try {
        // 为消息容器添加自定义滚动条逻辑
        const messageContainer = $('#messages');
        
        if (messageContainer.length > 0) {
            // 监听滚动事件，实现自动滚动到底部
            const scrollHandler = function() {
                // 判断是否滚动到底部
                const isAtBottom = messageContainer.scrollTop() + messageContainer.innerHeight() >= messageContainer[0].scrollHeight - 10;
                
                // 存储滚动状态
                if (!window.isAtBottom || isAtBottom) {
                    window.isAtBottom = isAtBottom;
                }
            };
            
            messageContainer.on('scroll', scrollHandler);
            eventListeners.set('messageContainerScroll', { element: messageContainer, event: 'scroll', handler: scrollHandler });
            
            // 初始化滚动状态
            setTimeout(() => {
                messageContainer.scrollTop(messageContainer[0].scrollHeight);
                window.isAtBottom = true;
            }, 500);
        }
        
        // 为房间列表添加自定义滚动条
        const roomListContainer = $('.room-list');
        
        if (roomListContainer.length > 0) {
            // 添加滚动监听
            const roomScrollHandler = function() {
                // 可以在这里添加滚动加载更多房间的逻辑
            };
            
            roomListContainer.on('scroll', roomScrollHandler);
            eventListeners.set('roomListScroll', { element: roomListContainer, event: 'scroll', handler: roomScrollHandler });
        }
        
        // 添加滚动条自动隐藏功能
        function setupAutoHideScrollbar(element) {
            if (!element || element.length === 0) return;
            
            let scrollTimeout;
            
            const handleScroll = function() {
                // 显示滚动条
                element.addClass('scrollbar-visible');
                
                // 清除之前的定时器
                clearTimeout(scrollTimeout);
                
                // 设置新的定时器，2秒后隐藏滚动条
                scrollTimeout = setTimeout(() => {
                    if (element.is(':not(:hover)')) {
                        element.removeClass('scrollbar-visible');
                    }
                }, 2000);
            };
            
            const handleMouseEnter = function() {
                element.addClass('scrollbar-visible');
                clearTimeout(scrollTimeout);
            };
            
            const handleMouseLeave = function() {
                scrollTimeout = setTimeout(() => {
                    if (!element.is(':animated') && !element.is(':hover')) {
                        element.removeClass('scrollbar-visible');
                    }
                }, 500);
            };
            
            element.on('scroll', handleScroll);
            element.on('mouseenter', handleMouseEnter);
            element.on('mouseleave', handleMouseLeave);
            
            // 保存事件监听器引用
            eventListeners.set(`${element.selector}-scroll`, { element, event: 'scroll', handler: handleScroll });
            eventListeners.set(`${element.selector}-mouseenter`, { element, event: 'mouseenter', handler: handleMouseEnter });
            eventListeners.set(`${element.selector}-mouseleave`, { element, event: 'mouseleave', handler: handleMouseLeave });
        }
        
        // 为消息容器和房间列表添加自动隐藏滚动条功能
        setupAutoHideScrollbar(messageContainer);
        setupAutoHideScrollbar(roomListContainer);
        
    } catch (error) {
        console.error('自定义滚动条设置失败:', error);
    }
}

/**
 * 滚动到消息容器底部
 * @param {boolean} force - 是否强制滚动到底部，即使之前没有在底部
 */
function scrollToBottom(force = false) {
    const messageContainer = $('#messages');
    if (messageContainer.length > 0) {
        if (force || window.isAtBottom) {
            // 使用动画平滑滚动到底部
            messageContainer.animate({
                scrollTop: messageContainer[0].scrollHeight
            }, 300);
        }
    }
}

/**
 * 添加全局异常处理
 */
function setupErrorHandling() {
    console.log('设置全局异常处理...');
    
    // 捕获JavaScript运行时错误
    const errorHandler = (event) => {
        console.error('页面错误:', event.error);
        
        // 记录错误详情
        const errorDetails = {
            message: event.error?.message || '未知错误',
            stack: event.error?.stack || '无堆栈信息',
            filename: event.filename || '',
            lineno: event.lineno || '',
            colno: event.colno || ''
        };
        
        console.error('错误详情:', errorDetails);
        
        // 显示友好的错误消息
        if (messageManager) {
            messageManager.showErrorMessage('发生错误，请刷新页面重试');
        } else {
            // 如果消息管理器还未初始化，使用alert
            setTimeout(() => {
                alert('页面发生错误，请刷新页面重试');
            }, 1000);
        }
        
        // 防止事件冒泡
        event.preventDefault();
    };
    
    // 捕获未处理的Promise拒绝
    const unhandledRejectionHandler = (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
        
        // 记录错误详情
        const rejectionDetails = {
            reason: event.reason?.message || String(event.reason),
            stack: event.reason?.stack || '无堆栈信息'
        };
        
        console.error('Promise拒绝详情:', rejectionDetails);
        
        // 显示友好的错误消息
        if (messageManager) {
            // 根据错误类型显示不同的消息
            let errorMessage = '操作失败，请重试';
            if (event.reason?.name === 'NetworkError') {
                errorMessage = '网络连接异常，请检查您的网络';
            } else if (event.reason?.name === 'TimeoutError') {
                errorMessage = '操作超时，请重试';
            }
            messageManager.showErrorMessage(errorMessage);
        } else {
            // 如果消息管理器还未初始化，使用alert
            setTimeout(() => {
                alert('操作失败，请重试');
            }, 1000);
        }
        
        // 防止事件冒泡
        event.preventDefault();
    };
    
    // 添加事件监听器
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
    
    // 保存事件监听器引用
    eventListeners.set('windowError', { element: window, event: 'error', handler: errorHandler });
    eventListeners.set('windowUnhandledRejection', { element: window, event: 'unhandledrejection', handler: unhandledRejectionHandler });
    
    // 添加离线检测
    const offlineHandler = () => {
        console.log('网络连接已断开');
        if (messageManager) {
            messageManager.showErrorMessage('网络连接已断开，请检查您的网络设置');
        }
    };
    
    const onlineHandler = () => {
        console.log('网络连接已恢复');
        if (messageManager) {
            messageManager.showSuccessMessage('网络连接已恢复');
            
            // 如果WebSocket未连接，尝试重新连接
            if (!webSocketManager.isConnected() && webSocketManager.getCurrentRoomId()) {
                setTimeout(() => {
                    messageManager.showSuccessMessage('正在尝试重新连接...');
                    webSocketManager.connect(webSocketManager.getCurrentRoomId(), currentUsername);
                }, 1000);
            }
        }
    };
    
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('online', onlineHandler);
    
    // 保存离线检测监听器引用
    eventListeners.set('windowOffline', { element: window, event: 'offline', handler: offlineHandler });
    eventListeners.set('windowOnline', { element: window, event: 'online', handler: onlineHandler });
    
    // 检查当前在线状态
    if (!navigator.onLine) {
        setTimeout(offlineHandler, 100);
    }
}

/**
 * 清理所有事件监听器
 */
function cleanupEventListeners() {
    console.log('清理事件监听器...');
    
    // 移除所有存储的事件监听器
    eventListeners.forEach((listenerInfo, key) => {
        try {
            if (listenerInfo.element && listenerInfo.event && listenerInfo.handler) {
                // 对于直接绑定到元素的事件监听器
                if (typeof listenerInfo.element.off === 'function') {
                    listenerInfo.element.off(listenerInfo.event, listenerInfo.handler);
                } else if (typeof listenerInfo.element.removeEventListener === 'function') {
                    listenerInfo.element.removeEventListener(listenerInfo.event, listenerInfo.handler);
                }
            } else if (listenerInfo.selector && listenerInfo.event && listenerInfo.handler) {
                // 对于通过jQuery的on方法绑定的委托事件监听器
                $(document).off(listenerInfo.event, listenerInfo.selector, listenerInfo.handler);
            } else if (listenerInfo.handler) {
                // 对于WebSocket相关的事件监听器
                if (key.startsWith('messageSent_') || key.startsWith('messageFailed_')) {
                    // 移除消息状态相关的监听器
                    if (webSocketManager && typeof webSocketManager.off === 'function') {
                        if (key.startsWith('messageSent_')) {
                            webSocketManager.off('message_sent', listenerInfo.handler);
                        } else if (key.startsWith('messageFailed_')) {
                            webSocketManager.off('message_send_failed', listenerInfo.handler);
                        }
                    }
                } else if (key.includes('-')) {
                    // 对于其他带有连字符的监听器ID
                    const [eventType] = key.split('-');
                    if (webSocketManager && typeof webSocketManager.off === 'function') {
                        webSocketManager.off(eventType, listenerInfo.handler);
                    }
                }
            }
        } catch (error) {
            console.error(`清理监听器 ${key} 时出错:`, error);
        }
    });
    
    // 清空事件监听器集合
    eventListeners.clear();
    
    // 清理WebSocket相关的所有事件监听器
    if (webSocketManager && typeof webSocketManager.clearAllListeners === 'function') {
        webSocketManager.clearAllListeners();
    }
    
    console.log('所有事件监听器已清理');
}

/**
 * 页面卸载时清理资源
 */
function cleanupOnUnload() {
    console.log('页面卸载时清理资源...');
    
    // 清理所有事件监听器
    cleanupEventListeners();
    
    // 断开WebSocket连接
    if (webSocketManager) {
        webSocketManager.disconnect('page_unload');
        
        // 调用WebSocketManager的clearAllListeners方法
        if (typeof webSocketManager.clearAllListeners === 'function') {
            webSocketManager.clearAllListeners();
        }
    }
    
    // 清理消息管理器
    if (messageManager) {
        // 清除所有消息
        messageManager.clearMessages();
        
        // 调用MessageManager的clearAllListeners方法
        if (typeof messageManager.clearAllListeners === 'function') {
            messageManager.clearAllListeners();
        }
        
        messageManager = null;
    }
    
    // 清除房间管理器的临时数据
    if (roomManager) {
        // 调用RoomManager的clearAllListeners方法
        if (typeof roomManager.clearAllListeners === 'function') {
            roomManager.clearAllListeners();
        }
    }
    
    // 清除认证管理器的临时数据
    if (authManager) {
        // 调用AuthManager的clearAllListeners方法
        if (typeof authManager.clearAllListeners === 'function') {
            authManager.clearAllListeners();
        }
    }
    
    // 清理定时器
    if (window.pageLoadTimer) {
        clearTimeout(window.pageLoadTimer);
        window.pageLoadTimer = null;
    }
    
    // 清理全局变量
    window.isAtBottom = null;
    
    console.log('资源清理完成');
}

/**
 * 初始化页面
 */
$(document).ready(() => {
    setupErrorHandling();
    init();
    
    // 页面卸载时清理资源
    window.addEventListener('beforeunload', cleanupOnUnload);
});

/**
 * 全局的创建房间函数，供HTML页面直接调用
 * @param {string} name - 房间名称
 * @param {string} description - 房间描述
 * @param {boolean} isPrivate - 是否私有房间
 * @param {number} maxMembers - 最大成员数
 * @returns {Promise} 创建房间的Promise
 */
function createRoom(name, description = '', isPrivate = false, maxMembers = 0) {
    // 如果没有提供name参数，尝试从表单中获取
    if (!name) {
        name = $('#roomName').val();
        description = $('#roomDescription').val();
        isPrivate = $('#isPrivate').is(':checked');
        maxMembers = $('#maxMembers').val();
    }
    
    return roomManager.createRoom(name, description, isPrivate, maxMembers)
        .catch(error => {
            // 错误已经在 roomManager.createRoom 中通过 alert 显示，这里只是确保 Promise 被正确处理
            console.error('创建房间失败:', error);
            // 重新抛出错误，以便调用者可以选择处理它
            throw error;
        });
}

// 导出全局方法供HTML直接调用
window.joinRoom = joinRoom;
window.logout = () => authManager.logout();
window.sendMessage = sendMessage;
window.createRoom = createRoom;