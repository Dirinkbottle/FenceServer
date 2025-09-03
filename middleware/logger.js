/**
 * 日志中间件
 */
const { Database } = require('../db');

// 日志类型常量
const LOG_TYPES = {
  INFO: 'info',
  ERROR: 'error',
  WARN: 'warn',
  DEBUG: 'debug'
};

/**
 * 将日志保存到数据库
 * @param {string} type - 日志类型
 * @param {string} message - 日志消息
 * @param {string} details - 详细信息
 * @param {string} ip - IP地址
 * @returns {Promise<Object>} - 插入结果
 */
async function saveLogToDatabase(type, message, details, ip = 'system') {
  try {
    if (!Database || typeof Database.insert !== 'function') {
      console.error('数据库对象未初始化或不包含insert方法');
      return { success: false, error: '数据库对象未初始化' };
    }
    
    const logData = {
      type,
      message,
      details: details || '',
      timestamp: new Date(),
      ip: ip || 'system'
    };
    
    return await Database.insert('system_logs', logData);
  } catch (error) {
    console.error('保存日志到数据库失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 记录日志
 * @param {string} type - 日志类型
 * @param {string} message - 日志消息
 * @param {string} details - 详细信息
 * @param {string} ip - IP地址
 */
async function logMessage(type, message, details = '', ip = 'system') {
  const timestamp = new Date().toISOString();
  
  // 控制台输出
  if (type === LOG_TYPES.ERROR) {
    console.error(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    if (details) console.error(details);
  } else {
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    if (details && type === LOG_TYPES.DEBUG) console.log(details);
  }
  
  // 保存到数据库 - 使用单独的函数处理，确保即使数据库操作失败也不会影响日志记录
  try {
    // 检查系统日志表是否存在
    saveLogToDatabase(type, message, details, ip).catch(err => {
      console.error('保存日志到数据库失败:', err);
    });
  } catch (error) {
    console.error('保存日志到数据库过程出错:', error);
  }
}

/**
 * 请求日志中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  // 记录请求开始
  console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - 开始 - IP: ${ip}`);
  
  // 保存原始的res.end方法
  const originalEnd = res.end;
  
  // 重写res.end方法，以便在响应结束时记录日志
  res.end = function(chunk, encoding) {
    // 调用原始的end方法
    originalEnd.call(this, chunk, encoding);
    
    // 计算请求处理时间
    const duration = Date.now() - start;
    
    // 记录请求完成
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - 完成 - 状态: ${res.statusCode} - 耗时: ${duration}ms`);
    
    // 记录到数据库（仅记录错误请求或特殊API请求）
    try {
      if (res.statusCode >= 400 || originalUrl.includes('/api/admin/') || duration > 1000) {
        const logType = res.statusCode >= 400 ? LOG_TYPES.ERROR : LOG_TYPES.INFO;
        const message = `${method} ${originalUrl} - 状态: ${res.statusCode}`;
        const details = `耗时: ${duration}ms, IP: ${ip}`;
        
        logMessage(logType, message, details, ip).catch(err => {
          console.error('记录请求日志失败:', err);
        });
      }
    } catch (error) {
      console.error('请求日志记录过程出错:', error);
    }
  };
  
  next();
}

/**
 * 错误日志中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function errorLogger(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const message = `错误 - ${req.method} ${req.originalUrl} - ${err.message}`;
  
  console.error(`[${timestamp}] ${message}`);
  console.error(err.stack);
  
  // 记录到数据库
  try {
    logMessage(LOG_TYPES.ERROR, message, err.stack, req.ip).catch(err => {
      console.error('记录错误日志失败:', err);
    });
  } catch (error) {
    console.error('错误日志记录过程出错:', error);
  }
  
  next(err);
}

/**
 * 应用日志记录函数 - 可以在应用的任何地方使用
 */
const appLogger = {
  info: (message, details = '') => logMessage(LOG_TYPES.INFO, message, details),
  error: (message, details = '') => logMessage(LOG_TYPES.ERROR, message, details),
  warn: (message, details = '') => logMessage(LOG_TYPES.WARN, message, details),
  debug: (message, details = '') => logMessage(LOG_TYPES.DEBUG, message, details)
};

// 检查系统日志表是否存在，如果不存在则创建
async function checkSystemLogsTable() {
  try {
    if (!Database || typeof Database.query !== 'function') {
      console.error('数据库对象未初始化或不包含query方法');
      return false;
    }
    
    // 检查表是否存在
    const checkTableSql = `
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'system_logs'
    `;
    
    const result = await Database.query(checkTableSql);
    const tableExists = result[0]?.table_exists > 0;
    
    if (!tableExists) {
      console.log('系统日志表不存在，正在创建...');
      
      // 创建表
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS \`system_logs\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`timestamp\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`type\` enum('info','error','warn','debug') NOT NULL DEFAULT 'info',
          \`message\` varchar(255) NOT NULL,
          \`details\` text,
          \`ip\` varchar(45) DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`idx_timestamp\` (\`timestamp\`),
          KEY \`idx_type\` (\`type\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `;
      
      await Database.query(createTableSql);
      console.log('系统日志表创建成功');
      
      // 添加初始日志
      await saveLogToDatabase('info', '系统日志功能已初始化', '系统日志表创建成功');
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('检查或创建系统日志表失败:', error);
    return false;
  }
}

// 初始化日志系统
async function initLogSystem() {
  try {
    await checkSystemLogsTable();
    console.log('日志系统初始化完成');
  } catch (error) {
    console.error('日志系统初始化失败:', error);
  }
}

module.exports = {
  requestLogger,
  errorLogger,
  appLogger,
  LOG_TYPES,
  initLogSystem
}; 