/**
 * 服务器启动文件 - 包含定时任务和其他初始化
 */
const app = require('./app');
const http = require('http');
const alipayOrderUpdate = require('./AliPay/aliorderUpdateEveryWhere');
require('dotenv').config();

// 引入日志系统初始化函数
const { initLogSystem } = require('./middleware/logger');

// 获取端口号
const port = process.env.PORT || 13147;

// 创建HTTP服务器
const server = http.createServer(app);

// 启动服务器
server.listen(port, async () => {
  console.log(`服务器已启动，监听端口 ${port}`);
  console.log(`访问地址: http://localhost:${port}`);
  
  // 初始化支付宝定时任务
  initAliPayOrderUpdateTask();
  
  // 初始化日志系统
  try {
    await initLogSystem();
  } catch (error) {
    console.error('日志系统初始化失败:', error);
    console.log('日志系统将以控制台模式运行，不会保存到数据库');
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  // 在生产环境中，可能需要更优雅的处理方式
  // 比如通知管理员、记录日志等
});

// 处理未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 处理SIGTERM信号（优雅关闭）
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，准备关闭服务器');
  
  // 停止定时任务
  alipayOrderUpdate.stopScheduledTask();
  
  // 关闭服务器
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 初始化支付宝订单自动更新任务
function initAliPayOrderUpdateTask() {
  // 启动支付宝订单自动更新任务
  if (process.env.ENABLE_AUTO_UPDATE !== 'false') {
    console.log('启动支付宝订单自动更新任务');
    alipayOrderUpdate.setupScheduledTask();
  }
} 