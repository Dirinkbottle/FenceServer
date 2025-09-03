/**
 * 服务器入口文件
 */
const app = require('./app');
const http = require('http');
require('dotenv').config();

// 获取端口号
const port = process.env.PORT || 3000;

// 创建HTTP服务器
const server = http.createServer(app);

// 启动服务器
server.listen(port, () => {
  console.log(`服务器已启动，监听端口 ${port}`);
  console.log(`访问地址: http://localhost:${port}`);
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
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});