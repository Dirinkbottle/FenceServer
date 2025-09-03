// shop.js
// 商品管理相关API
const { getDbConnection } = require('../normalapi.js');
const shoptable = process.env.Mysql_SHOP_TABLE;

// 获取所有商品（完整字段，图片转base64）
async function getAllProducts(req, res) {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute(
      `SELECT id, name, price, datail, belong, createdata, comment, purchaseint, png, discount, features, sort,  imggroup FROM ${shoptable}`
    );
    // 图片字段转base64字符串
    const products = rows.map(row => {
      let pngBase64 = null;
      if (row.png) {
        if (Buffer.isBuffer(row.png)) {
          pngBase64 = row.png.toString('base64');
        } else if (typeof row.png === 'string') {
          pngBase64 = row.png;
        }
      }
      // 价格保留2位小数，四舍五入
      if (row.price !== undefined && row.price !== null) {
        row.price = Number(Number(row.price).toFixed(2));
      }
      return { ...row, pngBase64 };
    });
    res.send({ success: true, products });
  } catch (err) {
    console.error('[getAllProducts error]', err);
    res.status(500).send({ success: false, message: '查询失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 新增商品（完整字段，支持图片base64等）
async function addProduct(req, res) {
  let { name, price, datail, belong, createdata, stock, pngBase64 } = req.body || {};
  if (!name || !price || !datail || !createdata || !belong || !stock || !pngBase64) {
    return res.status(400).send({ success: false, message: '缺少必要参数' });
  }
  // 其余字段全部置为 null，数值字段做类型和默认值处理
  let comment = null;
  let purchaseint = 0; // 默认0
  let discount = 10;   // 默认10折
  let features = null;
  let sort = null;
  let imggroup = null;
  // 类型处理
  if (stock === '' || stock === undefined || stock === null) stock = null;
  else stock = parseInt(stock, 10); if (isNaN(stock)) stock = null;
  // purchaseint 只允许数字，空或非法时为0
  if (typeof req.body.purchaseint !== 'undefined' && req.body.purchaseint !== '') {
    purchaseint = parseInt(req.body.purchaseint, 10);
    if (isNaN(purchaseint)) purchaseint = 0;
  }
  // discount 只允许数字，空或非法时为10
  if (typeof req.body.discount !== 'undefined' && req.body.discount !== '') {
    discount = parseFloat(req.body.discount);
    if (isNaN(discount)) discount = 10;
  }
  if (sort === '' || sort === undefined || sort === null) sort = null;
  else sort = parseInt(sort, 10); if (isNaN(sort)) sort = null;

  let connection;
  try {
    connection = await getDbConnection();
    // 处理图片base64
    let png = null;
    if (pngBase64) {
      try {
        png = Buffer.from(pngBase64, 'base64');
      } catch (e) {
        png = null;
      }
    }
    await connection.execute(
      `INSERT INTO ${shoptable} (name, price, datail, belong, createdata, comment, purchaseint, stock, png, discount, features, sort, imggroup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [name, price, datail, belong, createdata, comment, purchaseint, stock, png, discount, features, sort, imggroup]
    );
    res.send({ success: true, message: '商品新增成功' });
  } catch (err) {
    console.error('[addProduct error]', err);
    res.status(500).send({ success: false, message: '新增商品失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 编辑商品（完整字段）
async function editProduct(req, res) {
  const { id, name, price, datail, belong, createdata, comment, purchaseint, pngBase64, discount, features, sort, 种类, imggroup } = req.body || {};
  if (!id) {
    return res.status(400).send({ success: false, message: '缺少商品ID' });
  }
  let connection;
  try {
    connection = await getDbConnection();
    // 动态拼接SQL和参数，只更新有值的字段
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name=?'); params.push(name); }
    if (price !== undefined) { fields.push('price=?'); params.push(price); }
    if (datail !== undefined) { fields.push('datail=?'); params.push(datail); }
    if (belong !== undefined) { fields.push('belong=?'); params.push(belong); }
    if (createdata !== undefined) { fields.push('createdata=?'); params.push(createdata); }
    if (comment !== undefined) { fields.push('comment=?'); params.push(comment); }
    if (purchaseint !== undefined) { fields.push('purchaseint=?'); params.push(purchaseint === '' ? 0 : purchaseint); }
    // 处理pngBase64
    if (pngBase64 !== undefined) {
      let png = null;
      if (pngBase64 && pngBase64 !== '') {
        try {
          png = Buffer.from(pngBase64, 'base64');
        } catch (e) {
          console.error('[编辑商品] 图片base64转换失败', e);
        }
      }
      fields.push('png=?');
      params.push(png);
    }
    if (discount !== undefined) { fields.push('discount=?'); params.push(discount); }
    if (features !== undefined) { fields.push('features=?'); params.push(features); }
    if (sort !== undefined) { fields.push('sort=?'); params.push(sort); }
    if (typeof 种类 !== 'undefined') { fields.push('种类=?'); params.push(种类); }
    if (imggroup !== undefined) { fields.push('imggroup=?'); params.push(imggroup); }
    if (fields.length === 0) {
      return res.status(400).send({ success: false, message: '无可更新字段' });
    }
    params.push(id);
    await connection.execute(
      `UPDATE ${shoptable} SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    res.send({ success: true, message: '商品信息已更新' });
  } catch (err) {
    console.error('[editProduct error]', err);
    res.status(500).send({ success: false, message: '编辑商品失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 删除商品
async function deleteProduct(req, res) {
  const { id } = req.body || {};
  if (!id) return res.status(400).send({ success: false, message: '缺少商品ID' });
  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute(`DELETE FROM ${shoptable} WHERE id=?`, [id]);
    res.send({ success: true, message: '商品已删除' });
  } catch (err) {
    console.error('[deleteProduct error]', err);
    res.status(500).send({ success: false, message: '删除商品失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 获取热门商品数据
 */
async function getTopProducts(req, res) {
  try {
    const connection = await getDbConnection();
    
    // 查询销量最高的5个商品（根据订单中的数据统计）
    const [rows] = await connection.execute(
      `SELECT 
        prdunctname as product_name, 
        SUM(sumbuy) as total_sales
      FROM orders
      WHERE order_status = 1 AND pay_time IS NOT NULL
      GROUP BY product_id, prdunctname
      ORDER BY total_sales DESC
      LIMIT 5`
    );
    
    connection.end();
    
    // 提取商品名称和销量数据
    const labels = rows.map(row => row.product_name);
    const values = rows.map(row => parseInt(row.total_sales));
    
    res.json({
      success: true,
      data: {
        labels: labels,
        values: values
      }
    });
  } catch (error) {
    console.error('获取热门商品数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热门商品数据失败',
      error: error.message
    });
  }
}

module.exports = {
  getAllProducts,
  addProduct,
  editProduct,
  deleteProduct,
  getTopProducts,
};
