/**
 * auth.js - 登录/注册页面的入口文件
 */

// 导入认证管理组件
import { authManager } from './components/AuthManager.js';

/**
 * 页面初始化
 */
function init() {
    // 初始化认证管理
    authManager.initAuthPage();
    
    // 添加页面加载动画效果
    addPageAnimation();
}

/**
 * 添加页面动画效果
 */
function addPageAnimation() {
    // 表单元素淡入效果
    const formElements = $('.form-control, .btn');
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
    
    // 表单切换动画
    const originalSwitchToLogin = authManager.switchToLogin;
    const originalSwitchToRegister = authManager.switchToRegister;
    
    authManager.switchToLogin = function() {
        $('#register-form').fadeOut(200, () => {
            originalSwitchToLogin.call(authManager);
            $('#login-form').fadeIn(200);
        });
    };
    
    authManager.switchToRegister = function() {
        $('#login-form').fadeOut(200, () => {
            originalSwitchToRegister.call(authManager);
            $('#register-form').fadeIn(200);
        });
    };
}

/**
 * 添加全局异常处理
 */
function setupErrorHandling() {
    window.addEventListener('error', (event) => {
        console.error('页面错误:', event.error);
        // 可以在这里添加错误上报逻辑
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise拒绝:', event.reason);
        // 可以在这里添加错误上报逻辑
    });
}

/**
 * 初始化页面
 */
$(document).ready(() => {
    setupErrorHandling();
    init();
});

// 导出全局方法供HTML直接调用
window.switchToLogin = () => authManager.switchToLogin();
window.switchToRegister = () => authManager.switchToRegister();
window.login = () => authManager.login();
window.register = () => authManager.register();