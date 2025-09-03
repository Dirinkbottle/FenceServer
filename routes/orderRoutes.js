/**
 * 订单相关路由
 */
const express = require('express');
const router = express.Router();
const { checkLogin } = require('../middleware/auth');
const orderapi = require('../orderapi');
const shopapi = require('../shopapi');

// 创建订单
router.post('/create', checkLogin, orderapi.createOrderByProductIdAndUsername);

// 获取用户订单列表 - 使用shopapi中的函数
router.post('/list', checkLogin, shopapi.getOrdersByUsername);

// 获取订单详情
router.post('/detail', checkLogin, orderapi.getOrderDetailById);

// 订单支付
router.post('/pay', checkLogin, orderapi.purchaseOrderById);

// 删除订单
router.post('/delete', checkLogin, orderapi.destroyOrderById);

module.exports = router; 