// order.js
// 订单管理相关API
const { getDbConnection } = require('../normalapi.js');
const ordertable = process.env.Mysql_ORDER_TABLE || 'orders';

// 获取所有订单
async function getAllOrders(req, res) {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute(
      `SELECT close_time, create_time, delivery_company, delivery_sn, delivery_time, freight_amount, merchantId, order_id, order_sn, order_status, pay_amount, pay_time, pay_type, prdunctname, product_id, receiver_address, receiver_name, receiver_phone, receive_time, remark, sumbuy, total_amount, update_time, user_id FROM ${ordertable}`
    );
    res.send({ success: true, orders: rows });
  } catch (err) {
    console.error('[getAllOrders error]', err);
    res.status(500).send({ success: false, message: '查询失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 新增订单
async function addOrder(req, res) {
  const {
    close_time = null, create_time = null, delivery_company = '', delivery_sn = '', delivery_time = null, freight_amount = 0, merchantId, order_id, order_sn, order_status = 0, pay_amount = 0, pay_time = null, pay_type = null, prdunctname = '', product_id, receiver_address = '', receiver_name = '', receiver_phone = '', receive_time = null, remark = '', sumbuy = 1, total_amount = 0, update_time = null, user_id
  } = req.body || {};
  if (!order_id || !order_sn || !user_id || !merchantId || !product_id || !prdunctname) {
    return res.status(400).send({ success: false, message: '缺少必要参数' });
  }
  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute(
      `INSERT INTO ${ordertable} (close_time, create_time, delivery_company, delivery_sn, delivery_time, freight_amount, merchantId, order_id, order_sn, order_status, pay_amount, pay_time, pay_type, prdunctname, product_id, receiver_address, receiver_name, receiver_phone, receive_time, remark, sumbuy, total_amount, update_time, user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [close_time, create_time, delivery_company, delivery_sn, delivery_time, freight_amount, merchantId, order_id, order_sn, order_status, pay_amount, pay_time, pay_type, prdunctname, product_id, receiver_address, receiver_name, receiver_phone, receive_time, remark, sumbuy, total_amount, update_time, user_id]
    );
    res.send({ success: true, message: '订单新增成功' });
  } catch (err) {
    console.error('[addOrder error]', err);
    res.status(500).send({ success: false, message: '新增订单失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 编辑订单
async function editOrder(req, res) {
  const {
    close_time, create_time, delivery_company, delivery_sn, delivery_time, freight_amount, merchantId, order_id, order_sn, order_status, pay_amount, pay_time, pay_type, prdunctname, product_id, receiver_address, receiver_name, receiver_phone, receive_time, remark, sumbuy, total_amount, update_time, user_id
  } = req.body || {};
  if (!order_id) {
    return res.status(400).send({ success: false, message: '缺少订单ID' });
  }
  let connection;
  try {
    connection = await getDbConnection();
    // 动态拼接SQL和参数，只更新有值的字段
    const fields = [];
    const params = [];
    if (close_time !== undefined) { fields.push('close_time=?'); params.push(close_time && close_time !== ':00' ? close_time : null); }
    if (create_time !== undefined) { fields.push('create_time=?'); params.push(create_time && create_time !== ':00' ? create_time : null); }
    if (delivery_company !== undefined) { fields.push('delivery_company=?'); params.push(delivery_company); }
    if (delivery_sn !== undefined) { fields.push('delivery_sn=?'); params.push(delivery_sn); }
    if (delivery_time !== undefined) { fields.push('delivery_time=?'); params.push(delivery_time && delivery_time !== ':00' ? delivery_time : null); }
    if (freight_amount !== undefined) { fields.push('freight_amount=?'); params.push(freight_amount); }
    if (merchantId !== undefined) { fields.push('merchantId=?'); params.push(merchantId); }
    if (order_sn !== undefined) { fields.push('order_sn=?'); params.push(order_sn); }
    if (order_status !== undefined) { fields.push('order_status=?'); params.push(order_status); }
    if (pay_amount !== undefined) { fields.push('pay_amount=?'); params.push(pay_amount); }
    if (pay_time !== undefined) { fields.push('pay_time=?'); params.push(pay_time && pay_time !== ':00' ? pay_time : null); }
    if (pay_type !== undefined) { fields.push('pay_type=?'); params.push(pay_type); }
    if (prdunctname !== undefined) { fields.push('prdunctname=?'); params.push(prdunctname); }
    if (product_id !== undefined) { fields.push('product_id=?'); params.push(product_id); }
    if (receiver_address !== undefined) { fields.push('receiver_address=?'); params.push(receiver_address); }
    if (receiver_name !== undefined) { fields.push('receiver_name=?'); params.push(receiver_name); }
    if (receiver_phone !== undefined) { fields.push('receiver_phone=?'); params.push(receiver_phone); }
    if (receive_time !== undefined) { fields.push('receive_time=?'); params.push(receive_time && receive_time !== ':00' ? receive_time : null); }
    if (remark !== undefined) { fields.push('remark=?'); params.push(remark); }
    if (sumbuy !== undefined) { fields.push('sumbuy=?'); params.push(sumbuy); }
    if (total_amount !== undefined) { fields.push('total_amount=?'); params.push(total_amount); }
    if (update_time !== undefined) { fields.push('update_time=?'); params.push(update_time && update_time !== ':00' ? update_time : null); }
    if (user_id !== undefined) { fields.push('user_id=?'); params.push(user_id); }
    if (fields.length === 0) {
      return res.status(400).send({ success: false, message: '无可更新字段' });
    }
    params.push(order_id);
    await connection.execute(
      `UPDATE ${ordertable} SET ${fields.join(', ')} WHERE order_id = ?`,
      params
    );
    res.send({ success: true, message: '订单信息已更新' });
  } catch (err) {
    console.error('[editOrder error]', err);
    res.status(500).send({ success: false, message: '编辑订单失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 删除订单
async function deleteOrder(req, res) {
  // 支持批量删除：ids 数组 或 单个 id/order_id
  let ids = [];
  if (Array.isArray(req.body?.ids)) {
    ids = req.body.ids.filter(Boolean);
  } else if (req.body?.order_id || req.body?.id) {
    ids = [req.body.order_id || req.body.id];
  }
  if (!ids.length) {
    return res.status(400).send({ success: false, message: '缺少订单ID' });
  }
  let connection;
  try {
    connection = await getDbConnection();
    // 构造批量删除SQL
    const placeholders = ids.map(() => '?').join(',');
    await connection.execute(`DELETE FROM ${ordertable} WHERE order_id IN (${placeholders})`, ids);
    res.send({ success: true, message: `已删除${ids.length}个订单` });
  } catch (err) {
    console.error('[deleteOrder error]', err);
    res.status(500).send({ success: false, message: '删除订单失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 获取销售趋势数据
 */
async function getSalesTrend(req, res) {
  try {
    const connection = await getDbConnection();
    
    // 获取最近6个月的销售数据
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // 当前月 + 过去5个月 = 6个月
    
    // 按月分组查询已支付订单的销售额
    const [rows] = await connection.execute(
      `SELECT 
        DATE_FORMAT(pay_time, '%Y-%m') as month,
        SUM(pay_amount) as total_amount
       FROM orders 
       WHERE order_status = 1 AND pay_time IS NOT NULL
       AND pay_time >= ?
       GROUP BY DATE_FORMAT(pay_time, '%Y-%m')
       ORDER BY month ASC`,
      [sixMonthsAgo.toISOString().slice(0, 10)]
    );
    
    connection.end();
    
    // 生成最近6个月的月份列表（包括没有订单的月份）
    const months = [];
    const values = [];
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    // 生成最近6个月的数据
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - 5 + i);
      const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = monthNames[date.getMonth()];
      
      months.push(monthName);
      
      // 查找该月的销售额
      const monthData = rows.find(row => row.month === yearMonth);
      values.push(monthData ? parseFloat(monthData.total_amount) : 0);
    }
    
    res.json({
      success: true,
      data: {
        labels: months,
        values: values
      }
    });
  } catch (error) {
    console.error('获取销售趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取销售趋势数据失败',
      error: error.message
    });
  }
}

module.exports = {
  getAllOrders,
  addOrder,
  editOrder,
  deleteOrder,
  getSalesTrend,
};
