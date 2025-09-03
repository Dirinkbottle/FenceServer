/**
 * 系统监控API
 */
const { getSystemInfo } = require('../middleware/system-monitor');
const { getDbConnection } = require('../normalapi');

/**
 * 获取系统状态信息
 */
exports.getSystemStatus = (req, res) => {
  try {
    const systemInfo = getSystemInfo();
    
    // 格式化系统运行时间
    let uptimeStr = '';
    const days = Math.floor(systemInfo.uptime / 24);
    const hours = Math.floor(systemInfo.uptime % 24);
    
    // 统一格式，Windows和Linux显示相同
    uptimeStr = days > 0 ? `${days}天${hours}小时` : `${hours}小时`;

    res.json({
      success: true,
      data: {
        cpu: systemInfo.cpu,
        memory: systemInfo.memory,
        disk: systemInfo.disk,
        uptime: uptimeStr,
        platform: systemInfo.platform,
        timestamp: systemInfo.timestamp
      }
    });
  } catch (error) {
    console.error('获取系统状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统状态失败',
      error: error.message
    });
  }
}; 

/**
 * 获取待办事项统计数据
 * 包括待处理订单、低库存商品等
 */
exports.getTodoItems = async (req, res) => {
  let connection;
  try {
    connection = await getDbConnection();
    let pendingOrders = 0;
    let stockWarnings = 0;
    let latestOrderTime = null;
    let monthRevenue = 0;
    let totalRevenue = 0;
    
    // 使用try-catch分别处理每个查询，确保单个查询失败不影响整体结果
    try {
      // 查询待处理订单数量（状态为0=未支付的订单）
      const [pendingOrdersResult] = await connection.execute(
        'SELECT COUNT(*) as count FROM orders WHERE order_status = 0'
      );
      pendingOrders = pendingOrdersResult[0]?.count || 0;
    } catch (err) {
      console.error('查询待处理订单失败:', err);
    }
    
    try {
      // 查询低库存商品数量（库存小于10的商品）
      // 先检查products表是否存在
      const [tables] = await connection.execute(
        "SHOW TABLES LIKE 'products'"
      );
      
      if (tables.length > 0) {
        // 表存在，查询低库存商品
        const [stockWarningsResult] = await connection.execute(
          'SELECT COUNT(*) as count FROM products WHERE stock < 10 AND is_on_sale = 1'
        );
        stockWarnings = stockWarningsResult[0]?.count || 0;
      }
    } catch (err) {
      console.error('查询低库存商品失败:', err);
    }
    
    try {
      // 查询最近的未处理订单时间
      const [latestOrderResult] = await connection.execute(
        'SELECT create_time FROM orders WHERE order_status = 0 ORDER BY create_time DESC LIMIT 1'
      );
      latestOrderTime = latestOrderResult[0]?.create_time || null;
    } catch (err) {
      console.error('查询最近订单时间失败:', err);
    }
    
    // 格式化最近订单时间
    let latestOrderTimeStr = '';
    if (latestOrderTime) {
      const orderDate = new Date(latestOrderTime);
      latestOrderTimeStr = orderDate.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    try {
      // 统计当月收入（仅计算已支付的订单）
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const [monthRevenueResult] = await connection.execute(
        'SELECT SUM(pay_amount) as total FROM orders WHERE order_status = 1 AND pay_time >= ?',
        [firstDayOfMonth.toISOString()]
      );
      monthRevenue = monthRevenueResult[0]?.total || 0;
    } catch (err) {
      console.error('查询当月收入失败:', err);
    }
    
    try {
      // 统计总收入（所有已支付的订单）
      const [totalRevenueResult] = await connection.execute(
        'SELECT SUM(pay_amount) as total FROM orders WHERE order_status = 1'
      );
      totalRevenue = totalRevenueResult[0]?.total || 0;
    } catch (err) {
      console.error('查询总收入失败:', err);
    }
    
    res.json({
      success: true,
      data: {
        pendingOrders,
        stockWarnings,
        latestOrderTime: latestOrderTimeStr,
        monthRevenue: parseFloat(monthRevenue || 0).toFixed(2),
        totalRevenue: parseFloat(totalRevenue || 0).toFixed(2),
        userFeedbacks: 0, // 暂无用户反馈功能
        systemNotices: 0  // 暂无系统通知功能
      }
    });
  } catch (error) {
    console.error('获取待办事项统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待办事项统计失败',
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
}; 