/**
 * 支付宝订单自动更新任务
 * 用于定期同步订单状态，确保系统状态与支付宝状态一致
 * 简化版：直接查询orders表并更新，不使用alipay_transactions表
 * 注意只会查询支付宝方式支付的订单
 */

const { alipaySdk } = require('./alipayCore.js');
const { getDbConnection } = require('../normalapi.js');
const { safeStringify } = require('../utils.js');
require('dotenv').config();

// 调试模式标志
const DEBUG = true;


// 存储定时器引用，用于停止任务
let updateTimer = null;

/**
 * 查询所有需要更新状态的订单并同步
 * @returns {Promise<void>}
 */
async function updatePendingOrders() {
  console.log('开始检查订单支付状态...');
  let connection;
  try {
    connection = await getDbConnection();
    
    // 获取最近24小时内创建且pay_type=2的所有订单（包括未支付和已支付的）
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE create_time > DATE_SUB(NOW(), INTERVAL 24 HOUR) AND pay_type = 2 ORDER BY create_time DESC LIMIT 100'
    );
    
    console.log(`找到 ${orders.length} 个需要检查的订单`);
    
    let updatedCount = 0;
    
    // 遍历所有订单并查询支付宝状态
    for (const order of orders) {
      try {
        // 使用订单号作为商户订单号查询支付宝
        const outTradeNo = order.order_id;
        
        console.log(`查询订单: ${outTradeNo}, 当前状态: ${getStatusText(order.order_status)}`);
        
        // 调用支付宝查询接口
        const result = await queryAlipayOrder(outTradeNo);
        
        // 处理查询结果并更新订单状态
        const updated = await processQueryResult(result, order);
        if (updated) updatedCount++;
        
      } catch (error) {
        console.error(`处理订单 ${order.order_id} 时出错:`, error);
      }
    }
    
    console.log(`订单状态更新完成，共更新 ${updatedCount} 个订单状态`);
  } catch (error) {
    console.error('更新订单状态时出错:', error);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 查询支付宝订单状态
 * @param {string} outTradeNo - 商户订单号
 * @returns {Promise<Object>} 查询结果
 */
async function queryAlipayOrder(outTradeNo) {
  try {
    if (DEBUG) console.log(`开始查询支付宝订单: ${outTradeNo}`);
    
    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: outTradeNo
      }
    });
    
    if (DEBUG) {
      console.log('查询结果:');
      console.log(safeStringify(result));
    }
    
    return result;
  } catch (error) {
    console.error('查询支付宝订单失败:', error.message);
    throw error;
  }
}

/**
 * 处理支付宝查询结果并更新订单状态
 * @param {Object} result - 支付宝查询结果
 * @param {Object} order - 订单信息
 * @returns {Promise<boolean>} 是否更新了状态
 */
async function processQueryResult(result, order) {
  // 检查是否有响应结果
  if (!result) {
    console.log(`订单 ${order.order_id} 查询无结果`);
    return false;
  }
  
  // 支付宝API可能返回两种结构：
  // 1. {alipayTradeQueryResponse: {...}} - 通过网关同步请求返回
  // 2. {...} - 直接返回结果对象
  const response = result.alipayTradeQueryResponse || result;
  
  // 如果查询失败，记录错误并跳过
  if (response.code !== '10000') {
    console.log(`订单 ${order.order_id} 查询失败: ${response.sub_msg || response.msg}`);
    return false;
  }
  
  // 获取交易状态
  const tradeStatus = response.tradeStatus || response.trade_status;
  console.log(`订单 ${order.order_id} 支付宝状态: ${tradeStatus}`);
  
  // 确定需要更新的订单状态码
  let newStatus = null;
  
  // 根据交易状态确定订单状态
  switch(tradeStatus) {
    case 'TRADE_SUCCESS':
    case 'TRADE_FINISHED':
      newStatus = 1; // 已支付
      break;
      
    case 'TRADE_CLOSED':
      newStatus = 2; // 已退款
      break;
      
    case 'WAIT_BUYER_PAY':
      newStatus = 0; // 未支付
      break;
      
    default:
      console.log(`未处理的交易状态 ${tradeStatus}，跳过更新`);
      return false;
  }
  
  // 如果状态已经是正确的，无需更新
  if (order.order_status === newStatus) {
    console.log(`订单 ${order.order_id} 状态匹配，无需更新`);
    return false;
  }
  
  // 需要更新状态
  await updateOrderStatus(order.order_id, newStatus, response);
  return true;
}

/**
 * 更新订单状态
 * @param {string} orderId - 订单ID
 * @param {number} status - 状态码：0=未支付，1=已支付，2=已退款
 * @param {Object} response - 支付宝响应数据
 * @returns {Promise<void>}
 */
async function updateOrderStatus(orderId, status, response = null) {
  let connection;
  try {
    connection = await getDbConnection();
    
    let sql = 'UPDATE orders SET order_status = ?, update_time = NOW()';
    const params = [status, orderId];
    
    // 如果是支付成功状态，额外更新支付时间和支付类型
    if (status === 1 && response) {
      sql += ', pay_type = 2, pay_time = ?';
      // 支付宝的支付时间可能是sendPayDate或者gmtPayment
      const payTime = response.sendPayDate || response.send_pay_date || 
                     response.gmtPayment || response.gmt_payment || 
                     new Date().toISOString().replace('T', ' ').substring(0, 19);
      params.splice(1, 0, payTime);
    }
    
    sql += ' WHERE order_id = ?';
    
    // 执行更新
    await connection.execute(sql, params);
    
    console.log(`已更新订单 ${orderId} 状态为 ${getStatusText(status)}`);
  } catch (error) {
    console.error('更新订单状态失败:', error);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 获取状态文本描述
 * @param {number} status - 状态码
 * @returns {string} 状态文本
 */
function getStatusText(status) {
  return {
    0: '未支付',
    1: '已支付', 
    2: '已退款'
  }[status] || `状态码${status}`;
}

/**
 * 设置定时任务，每小时运行一次
 */
function setupScheduledTask() {
  console.log('初始化支付宝订单自动更新任务');
  
  // 初始运行一次
  updatePendingOrders()
    .then(() => console.log('首次订单更新完成'))
    .catch(err => console.error('订单更新出错:', err));
  
  // 每小时运行一次
  updateTimer = setInterval(() => {
    updatePendingOrders()
      .catch(err => console.error('定时订单更新出错:', err));
  }, 60 * 60 * 1000); // 60分钟 * 60秒 * 1000毫秒
  
  return updateTimer;
}

/**
 * 停止定时任务
 */
function stopScheduledTask() {
  if (updateTimer) {
    console.log('停止支付宝订单自动更新任务');
    clearInterval(updateTimer);
    updateTimer = null;
    return true;
  }
  return false;
}

// 导出函数，允许手动触发或集成到其他系统
module.exports = {
  updatePendingOrders,
  queryAlipayOrder,
  setupScheduledTask,
  stopScheduledTask
};