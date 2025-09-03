/**
 * 工具模块 - 包含通用功能和辅助函数
 * 避免循环依赖，抽取通用功能到单独模块
 */

/**
 * 生成随机订单号
 * @param {string} prefix - 订单号前缀，默认为ORDER
 * @returns {string} 订单号
 */
function generateOrderNumber(prefix = 'ORDER') {
  const now = new Date();
  const timestamp = now.getTime().toString().slice(-10);
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}${timestamp}${random}`;
}

/**
 * 生成简单的10位随机订单号（兼容旧版本）
 * @returns {string} 10位随机订单号
 */
function generateOrderId() {
  return Math.random().toString().slice(2, 12);
}

/**
 * 安全地序列化对象，避免循环引用
 * @param {Object} obj - 要序列化的对象
 * @param {Array<string>} safeKeys - 要包含的安全键列表
 * @returns {string} JSON字符串
 */
function safeStringify(obj, safeKeys = null) {
  if (!obj) return 'null';
  
  try {
    if (safeKeys) {
      // 如果提供了安全键列表，只提取这些键
      const safeObj = {};
      safeKeys.forEach(key => {
        if (obj[key] !== undefined) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            safeObj[key] = '[Object]';
          } else {
            safeObj[key] = obj[key];
          }
        }
      });
      return JSON.stringify(safeObj, null, 2);
    } else {
      // 使用自定义替换函数处理循环引用
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (key === 'socket' || key === 'parser') {
          return '[循环引用对象]';
        }
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[循环引用]';
          }
          cache.add(value);
        }
        return value;
      }, 2);
    }
  } catch (e) {
    return `[无法序列化: ${e.message}]`;
  }
}

/**
 * 创建模拟的请求和响应对象
 * @param {Object} requestData - 请求数据
 * @param {Function} onResponse - 响应回调函数
 * @returns {Object} 包含模拟req和res对象
 */
function createMockRequestResponse(requestData, onResponse = null) {
  const mockReq = { body: requestData, query: requestData };
  
  const mockRes = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    data: null,
    send: function(data) {
      this.data = data;
      if (onResponse) onResponse(data, this.statusCode);
      return this;
    },
    json: function(data) {
      this.data = data;
      if (onResponse) onResponse(data, this.statusCode);
      return this;
    }
  };
  
  return { req: mockReq, res: mockRes };
}

/**
 * 通用订单更新工具
 * @param {string} orderId - 订单ID
 * @param {Object} updateObj - 需要更新的字段和值，如 { pay_type: 2, order_status: 1 }
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateOrder(orderId, updateObj) {
  if (!orderId || !updateObj || typeof updateObj !== 'object') return false;
  const { getDbConnection } = require('./normalapi.js');
  let connection;
  try {
    connection = await getDbConnection();
    const keys = Object.keys(updateObj);
    if (keys.length === 0) return false;
    const setSql = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => updateObj[k]);
    params.push(orderId);
    const sql = `UPDATE orders SET ${setSql} WHERE order_id = ?`;
    const [result] = await connection.execute(sql, params);
    return result.affectedRows > 0;
  } catch (e) {
    console.error('[updateOrder] 更新订单失败:', e);
    return false;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 格式化金额，确保两位小数
 * @param {number|string} amount - 金额
 * @returns {string} 格式化后的金额字符串
 */
function formatAmount(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '0.00';
  return Math.max(num, 0.01).toFixed(2);
}

module.exports = {
  generateOrderNumber,
  generateOrderId,
  safeStringify,
  createMockRequestResponse,
  updateOrder,
  formatAmount
};