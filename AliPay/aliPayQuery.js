const {alipaySdk} = require("./alipayCore.js");
const { getDbConnection, getUserFieldsByname } = require('../normalapi.js');
require('dotenv').config();

// JWT 认证中间件（假设主路由已全局注册）
// 这里只做解析，不做校验
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;


/**
 * 查询当前用户所有订单并同步支付宝状态
 * 需带JWT，自动获取用户名
 */
async function queryAndSyncAllOrders(req, res) {
  try {
    // 1. 解析JWT获取用户名
    let token = req.headers.authorization || req.cookies?.token || req.body?.token || req.query?.token;
    if (token && token.startsWith('Bearer ')) token = token.slice(7);
    if (!token) return res.status(401).json({ success: false, message: '未提供JWT' });
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'JWT无效或已过期' });
    }
    const username = payload.username;
    if (!username) return res.status(400).json({ success: false, message: 'JWT中无用户名' });

    // 调用内部函数处理查询
    const result = await queryAndSyncOrdersByUsername(username);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 根据用户名查询和同步所有订单状态
 * @param {string} username - 用户名
 * @returns {Promise<Object>} 查询结果
 */
async function queryAndSyncOrdersByUsername(username) {
  if (!username) {
    return { success: false, message: '缺少用户名参数' };
  }

  // 1. 查询用户id
  const userResult = await getUserFieldsByname(username);
  if (!userResult.success || !userResult.user?.id) {
    return { success: false, message: '用户不存在' };
  }
  const userId = userResult.user.id;

  // 2. 查询该用户所有订单
  let connection;
  try {
    connection = await getDbConnection();
    const [orders] = await connection.execute(
      'SELECT order_id, order_status, pay_type FROM orders WHERE user_id = ? ORDER BY create_time DESC', 
      [userId]
    );
    
    if (!orders.length) {
      return { success: true, message: '该用户无订单', orders: [] };
    }
    
    // 3. 依次调用支付宝API查询并同步
    const results = [];
    let updatedCount = 0;
    
    for (const order of orders) {
      // 只处理支付宝支付的订单
      if (order.pay_type !== 2) {
        results.push({ 
          order_id: order.order_id, 
          status: order.order_status, 
          message: '非支付宝支付订单，跳过查询' 
        });
        continue;
      }
      
      try {
        const result = await alipaySdk.exec("alipay.trade.query", {
          bizContent: { out_trade_no: order.order_id }
        });
        
        // 解析支付宝返回
        const response = result.alipayTradeQueryResponse || result;
        
        // 映射状态
        let newStatus = order.order_status;
        let statusChanged = false;
        
        if (response.code === '10000') {
          const tradeStatus = response.tradeStatus || response.trade_status;
          
          switch (tradeStatus) {
            case 'TRADE_SUCCESS':
            case 'TRADE_FINISHED':
              newStatus = 1; break;
            case 'TRADE_CLOSED':
              newStatus = 2; break;
            case 'WAIT_BUYER_PAY':
              newStatus = 0; break;
          }
          
          // 如有变更，更新数据库
          if (newStatus !== order.order_status) {
            statusChanged = true;
            updatedCount++;
            
            // 构建更新SQL
            let sql = 'UPDATE orders SET order_status = ?, update_time = NOW()';
            const params = [newStatus];
            
            // 如果是支付成功状态，额外更新支付时间
            if (newStatus === 1) {
              sql += ', pay_time = ?';
              // 支付宝的支付时间可能是sendPayDate或者gmtPayment
              const payTime = response.sendPayDate || response.send_pay_date || 
                            response.gmtPayment || response.gmt_payment || 
                            new Date().toISOString().replace('T', ' ').substring(0, 19);
              params.push(payTime);
            }
            
            sql += ' WHERE order_id = ?';
            params.push(order.order_id);
            
            // 执行更新
            await connection.execute(sql, params);
          }
        }
        
        results.push({ 
          order_id: order.order_id, 
          old_status: order.order_status,
          new_status: newStatus,
          status_changed: statusChanged,
          alipay_response: {
            code: response.code,
            msg: response.msg,
            trade_status: response.tradeStatus || response.trade_status
          }
        });
      } catch (error) {
        results.push({ 
          order_id: order.order_id, 
          error: error.message 
        });
      }
    }
    
    return { 
      success: true, 
      username, 
      total_orders: orders.length,
      updated_orders: updatedCount,
      orders: results 
    };
  } catch (error) {
    return { success: false, message: error.message };
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 根据用户名查询订单API接口
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function queryOrdersByUsername(req, res) {
  try {
    const username = req.query.username || req.body?.username;
    if (!username) {
      return res.status(400).json({ success: false, message: '缺少用户名参数' });
    }
    
    // 调用内部函数处理查询
    const result = await queryAndSyncOrdersByUsername(username);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  queryAndSyncAllOrders,
  queryOrdersByUsername,
  queryAndSyncOrdersByUsername
};
