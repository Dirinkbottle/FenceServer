/**
 * 支付相关路由
 */
const express = require('express');
const router = express.Router();
const { checkLogin } = require('../middleware/auth');
const alipayService = require('../AliPay/alipayService');
const aliPayQuery = require('../AliPay/aliPayQuery');

// 支付宝支付（支持自定义notify_url）
router.post('/alipay', checkLogin, async (req, res) => {
  await alipayService.alipayOrderPay(req, res);
});

// 支付宝异步通知 - 默认路径
router.post('/alipay/notify', alipayService.handleAlipayNotify);

// 支付宝订单查询
router.get('/alipay/query', checkLogin, async (req, res) => {
  const orderId = req.query.order_id;
  if (!orderId) {
    return res.status(400).json({ success: false, message: '缺少订单号参数' });
  }
  
  const result = await alipayService.queryAlipayTrade(orderId);
  res.json(result);
});

// 同步用户所有未完成订单
router.get('/alipay/sync', checkLogin, async (req, res) => {
  const username = req.query.username || req.user?.username;
  if (!username) {
    return res.status(400).json({ success: false, message: '缺少用户名参数' });
  }
  
  const result = await alipayService.syncUserOrders(username);
  res.json(result);
});

// 根据用户名查询并同步所有订单
router.get('/alipay/user/orders', checkLogin, aliPayQuery.queryOrdersByUsername);

// 根据JWT查询并同步当前用户所有订单
router.get('/alipay/my/orders', checkLogin, aliPayQuery.queryAndSyncAllOrders);

module.exports = router; 