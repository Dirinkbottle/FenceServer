/**
 * 通用路由
 */
const express = require('express');
const router = express.Router();
const normalapi = require('../normalapi');
const path = require('path');

// 首页
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/index.html'));
});

// 获取用户须知
router.get('/usernotice', normalapi.getUserNotice);

// 获取关于我们
router.get('/aboutus', normalapi.getAboutUs);

// 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router; 