/**
 * 中间件索引文件 - 集中导出所有中间件
 */

const { verifyToken, checkLogin, checkAdmin } = require('./auth');
const { notFoundHandler, errorHandler, validationErrorHandler } = require('./error');
const { requestLogger, errorLogger } = require('./logger');
const { getSystemInfo } = require('./system-monitor');

module.exports = {
  // 认证中间件
  verifyToken,
  checkLogin,
  checkAdmin,
  
  // 错误处理中间件
  notFoundHandler,
  errorHandler,
  validationErrorHandler,
  
  // 日志中间件
  requestLogger,
  errorLogger,
  
  // 系统监控
  getSystemInfo,
  
  // 注册所有中间件
  registerMiddleware: (app) => {
    // 注册请求日志中间件
    app.use(requestLogger);
    
    // 错误处理中间件应该在路由之后注册
    return {
      registerErrorHandlers: () => {
        // 注册404处理中间件
        app.use(notFoundHandler);
        
        // 注册错误日志中间件
        app.use(errorLogger);
        
        // 注册验证错误处理中间件
        app.use(validationErrorHandler);
        
        // 注册全局错误处理中间件
        app.use(errorHandler);
      }
    };
  }
}; 