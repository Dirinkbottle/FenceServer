/**
 * 数据库访问层 - 提供统一的数据库操作接口
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  /**
   * 获取数据库连接
   * @returns {Promise<Connection>} 数据库连接对象
   */
  static async getConnection() {
    const dbConfig = {
      host: process.env.Mysql_HOST,
      user: process.env.Mysql_USER,
      password: process.env.Mysql_PASSWORD,
      database: process.env.Mysql_DATABASE,
    };
    
    if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
      throw new Error('数据库配置不完整');
    }
    
    return mysql.createConnection(dbConfig);
  }

  /**
   * 执行SQL查询
   * @param {string} sql - SQL语句
   * @param {Array} params - 查询参数
   * @returns {Promise<Array>} 查询结果
   */
  static async query(sql, params = []) {
    let connection;
    try {
      connection = await this.getConnection();
      const [results] = await connection.execute(sql, params);
      return results;
    } catch (error) {
      console.error('数据库查询错误:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * 查询单条记录
   * @param {string} table - 表名
   * @param {Object} conditions - 查询条件 {字段: 值}
   * @param {string|Array} fields - 查询字段，可以是字符串或数组
   * @returns {Promise<Object|null>} 查询结果
   */
  static async findOne(table, conditions, fields = '*') {
    const fieldStr = Array.isArray(fields) ? fields.map(f => `\`${f}\``).join(', ') : fields;
    
    const whereClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      whereClause.push(`\`${key}\` = ?`);
      params.push(value);
    }
    
    const sql = `SELECT ${fieldStr} FROM \`${table}\` WHERE ${whereClause.join(' AND ')} LIMIT 1`;
    
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 查询多条记录
   * @param {string} table - 表名
   * @param {Object} conditions - 查询条件 {字段: 值}
   * @param {Object} options - 查询选项 {fields, orderBy, limit, offset}
   * @returns {Promise<Array>} 查询结果
   */
  static async findAll(table, conditions = {}, options = {}) {
    const fields = options.fields || '*';
    const fieldStr = Array.isArray(fields) ? fields.map(f => `\`${f}\``).join(', ') : fields;
    
    const whereClause = [];
    const params = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      whereClause.push(`\`${key}\` = ?`);
      params.push(value);
    }
    
    let sql = `SELECT ${fieldStr} FROM \`${table}\``;
    
    if (whereClause.length > 0) {
      sql += ` WHERE ${whereClause.join(' AND ')}`;
    }
    
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }
    
    return this.query(sql, params);
  }

  /**
   * 插入记录
   * @param {string} table - 表名
   * @param {Object} data - 插入数据 {字段: 值}
   * @returns {Promise<Object>} 插入结果
   */
  static async insert(table, data) {
    const fields = Object.keys(data).map(key => `\`${key}\``).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const sql = `INSERT INTO \`${table}\` (${fields}) VALUES (${placeholders})`;
    
    let connection;
    try {
      connection = await this.getConnection();
      const [result] = await connection.execute(sql, values);
      return {
        success: true,
        insertId: result.insertId,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('数据库插入错误:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * 更新记录
   * @param {string} table - 表名
   * @param {Object} data - 更新数据 {字段: 值}
   * @param {Object} conditions - 更新条件 {字段: 值}
   * @returns {Promise<Object>} 更新结果
   */
  static async update(table, data, conditions) {
    const setClause = Object.keys(data).map(key => `\`${key}\` = ?`).join(', ');
    const whereClause = Object.keys(conditions).map(key => `\`${key}\` = ?`).join(' AND ');
    
    const values = [...Object.values(data), ...Object.values(conditions)];
    
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`;
    
    let connection;
    try {
      connection = await this.getConnection();
      const [result] = await connection.execute(sql, values);
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('数据库更新错误:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * 删除记录
   * @param {string} table - 表名
   * @param {Object} conditions - 删除条件 {字段: 值}
   * @returns {Promise<Object>} 删除结果
   */
  static async delete(table, conditions) {
    const whereClause = Object.keys(conditions).map(key => `\`${key}\` = ?`).join(' AND ');
    const values = Object.values(conditions);
    
    const sql = `DELETE FROM \`${table}\` WHERE ${whereClause}`;
    
    let connection;
    try {
      connection = await this.getConnection();
      const [result] = await connection.execute(sql, values);
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('数据库删除错误:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (connection) await connection.end();
    }
  }
}

// 修改导出方式，使其支持解构导入
module.exports = { Database }; 