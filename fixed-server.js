/**
 * 修复的服务器启动文件
 */
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// 创建Express应用
const app = express();

// 基本中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 简单的路由
app.get('/', (req, res) => {
  res.send('服务器运行正常');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 导入原来的API
const normalapi = require('./normalapi');
const shopapi = require('./shopapi');
const orderapi = require('./orderapi');
const cartapi = require('./cartapi');
const { alipayOrderPay } = require('./AliPay/alipayOrderApi');
const { alipayNotifyHandler } = require('./AliPay/alipaylisten');
const { queryAndSyncAllOrders } = require('./AliPay/aliPayQuery');

// 用户相关路由
app.post('/api/user/login', normalapi.login);
app.post('/api/user/register', normalapi.register);
app.get('/api/user/info', normalapi.authMiddleware, normalapi.getUserInfo);
app.post('/api/user/update', normalapi.authMiddleware, normalapi.updateUserInfo);
app.post('/api/user/changePassword', normalapi.authMiddleware, normalapi.changeUserPassword);
app.get('/api/user/wallet', normalapi.authMiddleware, normalapi.getUserBalance);

// 商店相关路由
app.get('/api/shop/products', shopapi.getRandomShopProducts);
app.get('/api/shop/product/:id', (req, res) => {
  req.query.id = req.params.id;
  return shopapi.getShopProductById(req, res);
});

// 订单相关路由
app.post('/api/order/create', normalapi.authMiddleware, orderapi.createOrderByProductIdAndUsername);
app.get('/api/order/list', normalapi.authMiddleware, shopapi.getOrdersByUsername);

// 支付宝相关路由
app.post('/api/payment/alipay', normalapi.authMiddleware, alipayOrderPay);
app.post('/api/payment/alipay/notify', alipayNotifyHandler);
app.get('/api/payment/alipay/query', normalapi.authMiddleware, queryAndSyncAllOrders);

// 购物车相关路由
app.get('/api/cart', normalapi.authMiddleware, cartapi.getCartDetail);
app.post('/api/cart/add', normalapi.authMiddleware, cartapi.addToCart);

// 获取端口号
const port = process.env.PORT || 13147;

// 启动服务器
app.listen(port, () => {
  console.log(`服务器已启动，监听端口 ${port}`);
  console.log(`访问地址: http://localhost:${port}`);
}); 