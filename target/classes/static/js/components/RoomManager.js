/**
 * RoomManager - 处理房间管理相关功能
 */
class RoomManager {
    constructor() {
        this.rooms = [];
        this.currentRoom = null;
        this.roomUpdateCallbacks = [];
    }

    /**
     * 加载房间列表
     * @returns {Promise}
     */
    loadRooms() {
        return new Promise((resolve, reject) => {
            $.get('/rooms', (data) => {
                this.rooms = data;
                this._updateRoomList();
                this._callCallbacks(this.roomUpdateCallbacks, data);
                resolve(data);
            }).fail((xhr) => {
                console.error('加载房间列表失败:', xhr);
                alert('加载房间列表失败: ' + xhr.responseText);
                reject(xhr);
            });
        });
    }

    /**
     * 创建新房间
     * @param {string} name - 房间名称
     * @param {string} description - 房间描述
     * @param {boolean} isPrivate - 是否私有房间
     * @param {number} maxMembers - 最大成员数
     * @returns {Promise}
     */
    createRoom(name, description = '', isPrivate = false, maxMembers = 0) {
        return new Promise((resolve, reject) => {
            // 表单验证
            if (!name || name.trim() === '') {
                alert('请输入房间名称');
                reject('房间名称不能为空');
                return;
            }

            if (name.length > 50) {
                alert('房间名称不能超过50个字符');
                reject('房间名称过长');
                return;
            }

            const roomData = {
                name: name.trim(),
                description: description.trim(),
                isPrivate: isPrivate,
                maxMembers: parseInt(maxMembers) || 0
            };

            // 显示创建中状态
            const messageElement = $('#createRoomMessage');
            messageElement.text('创建中...').removeClass('hidden error success').show();

            $.ajax({
                url: '/rooms',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(roomData),
                success: (data) => {
                    // 显示成功消息
                    messageElement.text('房间创建成功!').addClass('success').removeClass('error');
                    messageElement.show().delay(3000).fadeOut();
                    
                    // 重新加载房间列表
                    this.loadRooms();
                    
                    resolve(data);
                },
                error: (xhr) => {
                    // 显示错误消息
                    const errorMessage = xhr.responseText || '创建房间失败';
                    messageElement.text('创建房间失败: ' + errorMessage).addClass('error').removeClass('success');
                    messageElement.show().delay(3000).fadeOut();
                    
                    reject(xhr);
                }
            });
        });
    }

    /**
     * 加入房间
     * @param {number} roomId - 房间ID
     * @returns {Promise}
     */
    joinRoom(roomId) {
        return new Promise((resolve, reject) => {
            // 查找房间信息
            const room = this.rooms.find(r => r.id === roomId);
            
            if (!room) {
                reject('房间不存在');
                return;
            }

            this.currentRoom = room;
            
            // 更新聊天头部显示
            this._updateChatHeader(room);
            
            resolve(room);
        });
    }

    /**
     * 更新房间列表显示
     * @private
     */
    _updateRoomList() {
        const roomsDiv = $('#rooms');
        roomsDiv.empty();
        
        if (this.rooms.length === 0) {
            roomsDiv.append('<div class="text-center text-muted py-3">暂无房间，请创建一个新房间</div>');
            return;
        }

        this.rooms.forEach((room) => {
            const isCurrentRoom = this.currentRoom && this.currentRoom.id === room.id;
            
            roomsDiv.append(
                `<div class="room-item ${isCurrentRoom ? 'active' : ''}" onclick="joinRoom(${room.id})">` +
                `<strong>${room.name}</strong>` +
                `<div>创建者: ${(room.createdBy || '未知')}</div>` +
                `<div>描述: ${(room.description || '无')}</div>` +
                `<div>私有: ${(room.isPrivate ? '是' : '否')}</div>` +
                `</div>`
            );
        });
    }

    /**
     * 更新聊天头部显示
     * @private
     */
    _updateChatHeader(room) {
        const chatHeader = $('#chatHeader');
        chatHeader.html(`<h3>${room.name}</h3>`);
        
        // 显示消息输入框
        $('#messageForm').show();
    }

    /**
     * 获取房间信息
     * @param {number} roomId - 房间ID
     * @returns {Object|null} 房间信息对象
     */
    getRoomById(roomId) {
        return this.rooms.find(r => r.id === roomId) || null;
    }

    /**
     * 获取当前房间
     * @returns {Object|null} 当前房间信息
     */
    getCurrentRoom() {
        return this.currentRoom;
    }

    /**
     * 获取所有房间
     * @returns {Array} 房间列表
     */
    getAllRooms() {
        return this.rooms;
    }

    /**
     * 添加房间更新回调
     * @param {Function} callback - 回调函数
     * @returns {number} 回调ID，用于移除
     */
    onRoomUpdate(callback) {
        if (typeof callback === 'function') {
            this.roomUpdateCallbacks.push(callback);
            return this.roomUpdateCallbacks.length - 1;
        }
        return -1;
    }

    /**
     * 移除房间更新回调
     * @param {number} id - 回调ID
     */
    removeRoomUpdateCallback(id) {
        if (id >= 0 && id < this.roomUpdateCallbacks.length) {
            this.roomUpdateCallbacks.splice(id, 1);
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
     * 清除所有事件监听器和回调函数
     */
    clearAllListeners() {
        try {
            // 清空所有回调数组
            this.roomUpdateCallbacks = [];
            
            console.log('RoomManager: 所有事件监听器已清除');
        } catch (error) {
            console.error('清除事件监听器时发生错误:', error);
        }
    }

    /**
     * 初始化房间创建表单
     * @param {Function} onCreateSuccess - 创建成功回调
     */
    initCreateRoomForm(onCreateSuccess = null) {
        // 绑定创建房间按钮事件
        $('#createRoomButton').click(() => {
            const roomName = $('#roomName').val();
            const roomDescription = $('#roomDescription').val();
            const isPrivate = $('#isPrivate').is(':checked');
            const maxMembers = $('#maxMembers').val();

            this.createRoom(roomName, roomDescription, isPrivate, maxMembers)
                .then(data => {
                    // 清空表单
                    $('#roomName').val('');
                    $('#roomDescription').val('');
                    $('#isPrivate').prop('checked', false);
                    $('#maxMembers').val('');

                    if (typeof onCreateSuccess === 'function') {
                        onCreateSuccess(data);
                    }
                });
        });

        // 为表单添加回车键提交功能
        $('#roomName, #roomDescription, #maxMembers').keypress((e) => {
            if (e.which === 13) { // Enter键
                $('#createRoomButton').click();
            }
        });
    }
}

// 创建单例实例
export const roomManager = new RoomManager();