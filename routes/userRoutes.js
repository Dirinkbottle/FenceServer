/**
 * 用户相关路由
 */
const express = require('express');
const router = express.Router();
const { checkLogin } = require('../middleware/auth');
const normalapi = require('../normalapi');
const api = require('../api');
// 用户登录
router.post('/login', normalapi.login);

// 用户注册
router.post('/register', normalapi.register);

// 获取用户信息
router.all('/profile', checkLogin, normalapi.UserProfile);

// 更新用户信息
router.post('/update', checkLogin, normalapi.updateUserInfo);

// 更改密码
router.post('/changePassword', checkLogin, normalapi.changeUserPassword);

// 获取用户余额
router.all('/balance', checkLogin, normalapi.getUserBalance);

//更新头像
router.post('/updateAvatar', checkLogin, normalapi.uploadAvatar);

//后台api
router.all('/getapi',api.getApi)
module.exports = router; 