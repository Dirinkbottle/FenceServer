/**
 * 应用主文件
 */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

// 导入路由和中间件
const routes = require('./routes');
const middleware = require('./middleware');
const alipayService = require('./AliPay/alipayService');

// 创建Express应用
const app = express();

// 基本中间件
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/avatar', express.static(path.join(__dirname, '..', 'uploads', 'avatar')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// 注册日志中间件
app.use(middleware.requestLogger);

// 注册路由
app.use('/api', routes);

// 根路径访问重定向到/static/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// 支付宝通用回调处理 - 处理根路径下的任意回调
app.post('/alipay/callback/:path', (req, res) => {
  console.log(`[支付回调] 收到根路径回调: ${req.originalUrl}`);
  alipayService.handleAlipayNotify(req, res);
});

// 注册错误处理中间件
app.use(middleware.notFoundHandler);
app.use(middleware.errorLogger);
app.use(middleware.validationErrorHandler);
app.use(middleware.errorHandler);

// 导出应用
module.exports = app; 