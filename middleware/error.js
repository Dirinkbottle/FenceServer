/**
 * 错误处理中间件
 */

/**
 * 404错误处理
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: '未找到请求的资源',
    path: req.originalUrl
  });
}

/**
 * 全局错误处理
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorHandler(err, req, res, next) {
  // 记录错误
  console.error(`[${new Date().toISOString()}] 错误:`, err);
  
  // 确定状态码
  const statusCode = err.statusCode || 500;
  
  // 开发环境下返回详细错误信息
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(isDev ? { stack: err.stack } : {})
  });
}

/**
 * 请求验证错误处理
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function validationErrorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '请求参数验证失败',
      errors: err.errors
    });
  }
  next(err);
}

module.exports = {
  notFoundHandler,
  errorHandler,
  validationErrorHandler
}; 