/**
 * AuthManager - 处理用户认证相关功能
 */
class AuthManager {
    constructor() {
        // 存储当前用户信息
        this.currentUser = null;
        
        // 防抖延迟（毫秒）
        this.debounceDelay = 300;
    }

    /**
     * 切换到登录表单
     */
    switchToLogin() {
        $('#register-form').fadeOut(200, () => {
            $('#login-form').fadeIn(200);
            $('#login-tab').addClass('active');
            $('#register-tab').removeClass('active');
        });
    }

    /**
     * 切换到注册表单
     */
    switchToRegister() {
        $('#login-form').fadeOut(200, () => {
            $('#register-form').fadeIn(200);
            $('#register-tab').addClass('active');
            $('#login-tab').removeClass('active');
        });
    }

    /**
     * 用户注册
     */
    register() {
        const username = $('#reg-username').val().trim();
        const password = $('#reg-password').val().trim();
        const email = $('#reg-email').val().trim();

        // 清除之前的消息
        this.clearMessages();

        // 表单验证
        if (!username) {
            this.showError('请输入用户名');
            return;
        }
        if (!password) {
            this.showError('请输入密码');
            return;
        }
        if (password.length < 6) {
            this.showError('密码长度至少为6位');
            return;
        }
        if (!email) {
            this.showError('请输入邮箱');
            return;
        }
        
        // 邮箱格式验证
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(email)) {
            this.showError('请输入有效的邮箱地址');
            return;
        }

        const user = {
            username: username,
            passwordHash: password,
            email: email
        };

        // 禁用注册按钮防止重复提交
        const registerButton = $('#register-form button');
        const originalText = registerButton.text();
        registerButton.prop('disabled', true).text('注册中...');

        // 使用 AJAX 发送 JSON 数据
        $.ajax({
            url: '/auth/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(user),
            success: (res) => {
                this.showSuccess(res || '注册成功，请登录');
                this.switchToLogin();
                // 清空注册表单
                $('#reg-username').val('');
                $('#reg-password').val('');
                $('#reg-email').val('');
            },
            error: (err) => {
                this.showError('注册失败: ' + (err.responseText || '未知错误'));
            },
            complete: () => {
                // 恢复注册按钮状态
                registerButton.prop('disabled', false).text(originalText);
            }
        });
    }

    /**
     * 用户登录
     */
    login() {
        const username = $('#login-username').val().trim();
        const password = $('#login-password').val().trim();

        // 清除之前的消息
        this.clearMessages();

        // 表单验证
        if (!username) {
            this.showError('请输入用户名');
            return;
        }
        if (!password) {
            this.showError('请输入密码');
            return;
        }

        const user = {
            username: username,
            passwordHash: password
        };

        // 禁用登录按钮防止重复提交
        const loginButton = $('#login-form button');
        const originalText = loginButton.text();
        loginButton.prop('disabled', true).text('登录中...');

        // 使用 AJAX 发送 JSON 数据
        $.ajax({
            url: '/auth/login',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(user),
            success: (res) => {
                window.location.href = '/chat.html'; // 登录成功跳转聊天页
            },
            error: (err) => {
                this.showError('登录失败: ' + (err.responseText || '未知错误'));
            },
            complete: () => {
                // 恢复登录按钮状态
                loginButton.prop('disabled', false).text(originalText);
            }
        });
    }

    /**
     * 获取当前登录用户
     * @returns {Promise}
     */
    getCurrentUser() {
        return new Promise((resolve, reject) => {
            $.get('/auth/current-user', (data) => {
                if (data) {
                    this.currentUser = data;
                    resolve(data);
                } else {
                    reject('未登录');
                }
            }).fail((xhr) => {
                reject(xhr.responseText || '获取用户信息失败');
            });
        });
    }

    /**
     * 退出登录
     */
    logout() {
        $.post('/auth/logout', () => {
            window.location.href = '/';
        });
    }

    /**
     * 初始化登录/注册页面
     */
    initAuthPage() {
        // 添加页面加载动画效果
        this.addPageAnimation();
        
        // 绑定登录按钮事件
        $('#login-form button').click(() => this.login());
        $('#login-username, #login-password').keypress((e) => {
            if (e.which === 13) { // Enter键
                this.login();
            }
        });

        // 绑定注册按钮事件
        $('#register-form button').click(() => this.register());
        $('#reg-username, #reg-password, #reg-email').keypress((e) => {
            if (e.which === 13) { // Enter键
                this.register();
            }
        });

        // 绑定表单切换事件
        $('#login-tab').click((e) => {
            e.preventDefault();
            this.switchToLogin();
        });
        $('#register-tab').click((e) => {
            e.preventDefault();
            this.switchToRegister();
        });
    }

    /**
     * 初始化聊天页面的用户认证
     */
    initChatPage() {
        // 获取当前用户
        this.getCurrentUser()
            .then(username => {
                $('#currentUser').text(username);
            })
            .catch(() => {
                window.location.href = '/';
            });

        // 绑定退出登录按钮事件
        $('#logoutButton').click(() => this.logout());
    }
    
    /**
     * 添加页面动画效果
     */
    addPageAnimation() {
        // 表单元素淡入效果
        const formElements = $('.form-control, button');
        formElements.each((index, element) => {
            setTimeout(() => {
                $(element).css({
                    opacity: '0',
                    transform: 'translateY(10px)'
                });
                $(element).animate({
                    opacity: '1',
                    transform: 'translateY(0)'
                }, 300 + (index * 50));
            }, 100);
        });
    }
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showError(message) {
        // 创建错误消息元素
        let errorElement = $('#auth-error');
        if (!errorElement.length) {
            errorElement = $('<div/>', {
                id: 'auth-error',
                class: 'alert alert-danger alert-dismissible fade show',
                role: 'alert',
                style: 'margin-bottom: 20px;'
            }).append(
                $('<button/>', {
                    type: 'button',
                    class: 'btn-close',
                    'data-bs-dismiss': 'alert',
                    'aria-label': 'Close'
                })
            ).prependTo('.card-body');
        }
        
        // 设置错误消息文本
        errorElement.find('.btn-close').after(message);
        
        // 显示错误消息并添加动画
        errorElement.fadeIn().animate({ opacity: 1 }, 300);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorElement.fadeOut().animate({ opacity: 0 }, 300);
        }, 3000);
    }
    
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     */
    showSuccess(message) {
        // 创建成功消息元素
        let successElement = $('#auth-success');
        if (!successElement.length) {
            successElement = $('<div/>', {
                id: 'auth-success',
                class: 'alert alert-success alert-dismissible fade show',
                role: 'alert',
                style: 'margin-bottom: 20px;'
            }).append(
                $('<button/>', {
                    type: 'button',
                    class: 'btn-close',
                    'data-bs-dismiss': 'alert',
                    'aria-label': 'Close'
                })
            ).prependTo('.card-body');
        }
        
        // 设置成功消息文本
        successElement.find('.btn-close').after(message);
        
        // 显示成功消息并添加动画
        successElement.fadeIn().animate({ opacity: 1 }, 300);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            successElement.fadeOut().animate({ opacity: 0 }, 300);
        }, 3000);
    }
    
    /**
     * 清除所有消息
     */
    clearMessages() {
        $('#auth-error, #auth-success').fadeOut().remove();
    }
    
    /**
     * 清除所有事件监听器和回调函数
     */
    clearAllListeners() {
        try {
            console.log('AuthManager: 事件监听器已清除');
        } catch (error) {
            console.error('清除事件监听器时发生错误:', error);
        }
    }
}

export const authManager = new AuthManager();