/**
 * 管理员路由
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const { checkAdmin } = require('../middleware/auth');
const { Database } = require('../db');

// 导入管理员API模块
const userApi = require('../admin/user');
const shopApi = require('../admin/shop');
const orderApi = require('../admin/order');
const configApi = require('../admin/config');
const systemApi = require('../admin/system');
// 新增的API模块将在后续实现
// const categoryApi = require('../admin/category');
// const notificationApi = require('../admin/notification');
// const dashboardApi = require('../admin/dashboard');
// const logsApi = require('../admin/logs');

// 静态文件服务
router.use('/', express.static(path.join(__dirname, '../admin')));

// 首页重定向到登录页
router.get('/', (req, res) => {
  res.redirect('/admin/login.html');
});

// 用户管理路由
router.post('/getAllUsers', checkAdmin, userApi.getAllUsers);
router.post('/addUser', checkAdmin, userApi.addUser);
router.post('/editUser', checkAdmin, userApi.editUser);
router.post('/deleteUser', checkAdmin, userApi.deleteUser);

// 商品管理路由
router.post('/getAllProducts', checkAdmin, shopApi.getAllProducts);
router.post('/addProduct', checkAdmin, shopApi.addProduct);
router.post('/editProduct', checkAdmin, shopApi.editProduct);
router.post('/deleteProduct', checkAdmin, shopApi.deleteProduct);

// 订单管理路由
router.post('/getAllOrders', checkAdmin, orderApi.getAllOrders);
router.all('/getAllOrders', checkAdmin, orderApi.getAllOrders);
router.post('/addOrder', checkAdmin, orderApi.addOrder);
router.post('/editOrder', checkAdmin, orderApi.editOrder);
router.post('/deleteOrder', checkAdmin, orderApi.deleteOrder);

// 配置管理路由
router.post('/getAllConfigs', checkAdmin, configApi.getAllConfigs);
router.post('/editConfig', checkAdmin, configApi.editConfig);
router.post('/deleteConfig', checkAdmin, configApi.deleteConfig);

// 仪表盘路由 - 销售趋势
router.post('/getSalesTrend', checkAdmin, orderApi.getSalesTrend);

router.post('/getTopProducts', checkAdmin, shopApi.getTopProducts);

router.post('/getSystemStatus', checkAdmin, systemApi.getSystemStatus);

router.post('/getTodoItems', checkAdmin, systemApi.getTodoItems);

// 添加测试路由，确认路由系统工作正常
router.post('/testApi', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '测试API正常工作',
    timestamp: new Date().toISOString()
  });
});

// 分类管理路由 - 新增
router.post('/getAllCategories', checkAdmin, (req, res) => {
  // 临时返回模拟数据，后续将实现真正的API
  res.json({
    success: true,
    categories: [
      { 
        id: 1, 
        name: '有机蔬菜', 
        description: '无公害绿色蔬菜', 
        icon: 'flower3', 
        sort: 0,
        created_at: '2025-01-15'
      },
      { 
        id: 2, 
        name: '五谷杂粮', 
        description: '健康粗粮', 
        icon: 'flower1', 
        sort: 1,
        created_at: '2025-01-15'
      },
      { 
        id: 3, 
        name: '新鲜水果', 
        description: '应季水果', 
        icon: 'flower2', 
        sort: 2,
        created_at: '2025-01-15'
      },
      { 
        id: 4, 
        name: '禽蛋类', 
        description: '生态养殖', 
        icon: 'egg-fried', 
        sort: 3,
        parent_id: null,
        created_at: '2025-01-15'
      }
    ]
  });
});

// 添加分类 (暂时返回成功)
router.post('/addCategory', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '分类添加成功'
  });
});

// 编辑分类 (暂时返回成功)
router.post('/editCategory', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '分类更新成功'
  });
});

// 删除分类 (暂时返回成功)
router.post('/deleteCategory', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '分类删除成功'
  });
});

// 通知管理路由 - 新增
router.post('/getAllNotifications', checkAdmin, (req, res) => {
  // 临时返回模拟数据，后续将实现真正的API
  res.json({
    success: true,
    notifications: [
      { 
        id: 1, 
        type: 'system', 
        title: '系统升级通知', 
        content: '系统将于2025年6月25日进行升级维护，届时系统将暂停使用2小时，请合理安排使用时间。', 
        status: 'active',
        created_at: '2025-06-20 15:30:00',
        expire_time: '2025-06-26 00:00:00'
      },
      { 
        id: 2, 
        type: 'promotion', 
        title: '618年中大促', 
        content: '618年中大促即将开始，全场商品低至5折起，更有满减优惠券免费领取，请及时关注活动详情。', 
        status: 'active',
        created_at: '2025-06-15 10:00:00',
        expire_time: '2025-06-19 00:00:00'
      },
      { 
        id: 3, 
        type: 'order', 
        title: '订单处理规则调整', 
        content: '即日起，系统对订单处理流程进行了优化，所有订单将在30分钟内完成审核，请各位商家及时关注订单状态变化。', 
        status: 'inactive',
        created_at: '2025-06-10 14:20:00',
        expire_time: null
      }
    ]
  });
});

// 添加通知 (暂时返回成功)
router.post('/addNotification', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '通知添加成功'
  });
});

// 编辑通知 (暂时返回成功)
router.post('/editNotification', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '通知更新成功'
  });
});

// 删除通知 (暂时返回成功)
router.post('/deleteNotification', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '通知删除成功'
  });
});

// 更新通知状态 (暂时返回成功)
router.post('/updateNotificationStatus', checkAdmin, (req, res) => {
  res.json({
    success: true,
    message: '通知状态已更新'
  });
});

// 系统日志路由 - 更新为实际查询
router.post('/getSystemLogs', checkAdmin, async (req, res) => {
  try {
    const { type, limit = 100, page = 1, search = '' } = req.body;
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const conditions = {};
    if (type && type !== 'all') {
      conditions.type = type;
    }
    
    // 如果有搜索关键字
    let searchSql = '';
    let searchParams = [];
    if (search) {
      searchSql = 'AND (message LIKE ? OR details LIKE ?)';
      const searchTerm = `%${search}%`;
      searchParams = [searchTerm, searchTerm];
    }
    
    // 查询日志总数
    const countSql = `SELECT COUNT(*) as total FROM system_logs WHERE 1=1 
                      ${type && type !== 'all' ? 'AND type = ?' : ''} 
                      ${searchSql}`;
    
    const countParams = [];
    if (type && type !== 'all') {
      countParams.push(type);
    }
    if (search) {
      countParams.push(...searchParams);
    }
    
    const [countResults] = await Database.query(countSql, countParams);
    const total = countResults && countResults.length > 0 ? countResults[0].total : 0;
    
    // 查询日志数据
    const sql = `SELECT * FROM system_logs WHERE 1=1 
                ${type && type !== 'all' ? 'AND type = ?' : ''} 
                ${searchSql}
                ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    
    const params = [];
    if (type && type !== 'all') {
      params.push(type);
    }
    if (search) {
      params.push(...searchParams);
    }
    params.push(parseInt(limit), parseInt(offset));
    
    const logs = await Database.query(sql, params);
    
    res.json({
      success: true,
      logs: logs || [],
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取系统日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统日志失败',
      error: error.message
    });
  }
});

// 删除日志
router.post('/deleteSystemLogs', checkAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要删除的日志'
      });
    }
    
    // 准备SQL语句和参数
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM system_logs WHERE id IN (${placeholders})`;
    
    // 执行删除操作
    const [result] = await Database.query(sql, ids);
    const affectedRows = result && result.affectedRows ? result.affectedRows : 0;
    
    // 记录操作日志
    const { appLogger } = require('../middleware/logger');
    await appLogger.info(`管理员删除了${ids.length}条系统日志`, `日志ID: ${ids.join(', ')}`);
    
    res.json({
      success: true,
      message: `成功删除${affectedRows || ids.length}条日志`,
      affectedRows: affectedRows || ids.length
    });
  } catch (error) {
    console.error('删除系统日志失败:', error);
    res.status(500).json({
      success: false,
      message: '删除系统日志失败',
      error: error.message
    });
  }
});

// 清空日志
router.post('/clearSystemLogs', checkAdmin, async (req, res) => {
  try {
    const { type } = req.body;
    
    let sql = 'DELETE FROM system_logs';
    const params = [];
    
    // 如果指定了日志类型，则只清空该类型的日志
    if (type && type !== 'all') {
      sql += ' WHERE type = ?';
      params.push(type);
    }
    
    // 执行清空操作
    const [result] = await Database.query(sql, params);
    const affectedRows = result && result.affectedRows ? result.affectedRows : 0;
    
    // 记录操作日志
    const { appLogger } = require('../middleware/logger');
    await appLogger.warn(
      `管理员清空了系统日志${type && type !== 'all' ? ` (类型: ${type})` : ''}`,
      `影响行数: ${affectedRows || 0}`
    );
    
    res.json({
      success: true,
      message: `成功清空${type && type !== 'all' ? type + '类型的' : '所有'}日志`,
      affectedRows: affectedRows || 0
    });
  } catch (error) {
    console.error('清空系统日志失败:', error);
    res.status(500).json({
      success: false,
      message: '清空系统日志失败',
      error: error.message
    });
  }
});

module.exports = router; 