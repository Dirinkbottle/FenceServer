/**
 * 认证中间件
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * 验证JWT令牌
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function verifyToken(req, res, next) {
  // 从请求头获取令牌
  const token = req.headers['authorization']?.split(' ')[1] || 
                req.headers['x-access-token'] || 
                req.query.token || 
                req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供访问令牌'
    });
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '无效的访问令牌',
      error: error.message
    });
  }
}

/**
 * 检查是否已登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function checkLogin(req, res, next) {
  // 从请求头获取令牌
  const token = req.headers['authorization']?.split(' ')[1] || 
                req.headers['x-access-token'] || 
                req.query.token || 
                req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未登录，请先登录'
    });
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '登录已过期，请重新登录',
      error: error.message
    });
  }
}

/**
 * 检查是否为管理员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function checkAdmin(req, res, next) {
  // 先验证是否已登录
  checkLogin(req, res, () => {
    // 检查用户是否为管理员 (permission为1代表管理员)
    if (req.user && req.user.permission === 1) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限',
        needLogin: true
      });
    }
  });
}

module.exports = {
  verifyToken,
  checkLogin,
  checkAdmin
}; 