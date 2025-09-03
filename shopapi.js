const {getDbConnection} = require('./normalapi.js');
const shoptable = process.env.Mysql_SHOP_TABLE;
//钱包充值
async function rechargeWallet(user, amount){
    const connection = await getDbConnection();
    try {
        // 检查用户是否存在
        const [userRows] = await connection.execute(
            `SELECT id, balance FROM users WHERE username = ?`, [user]
        );
        if (userRows.length === 0) {
            throw new Error('用户不存在');
        }
        const userId = userRows[0].id;
        const currentBalance = userRows[0].balance || 0;

        // 更新钱包余额
        const newBalance = currentBalance + amount;
        await connection.execute(
            `UPDATE users SET balance = ? WHERE id = ?`, [newBalance, userId]
        );

        return { success: true, newBalance };
    } catch (error) {
        console.error('充值失败:', error);
        return { success: false, message: error.message };
    } finally {
        if (connection) await connection.end();
    }
} 

// 通过商品id仅获取商品图片（base64字符串）
async function getShopProductImageById(req, res) {
    const connection = await getDbConnection();
    const id = req.body?.id ?? req.query?.id;
    if (!id) {
        res.status(400).send({ error: '缺少商品id' });
        return;
    }
    const sql = `SELECT png FROM ${shoptable} WHERE id = ?`;
    const [rows] = await connection.execute(sql, [id]);
    if (rows.length === 0) {
        res.status(404).send({ error: '未找到商品' });
        return;
    }
    const product = rows[0];
    let pngBase64 = null;
    if (product.png) {
        if (Buffer.isBuffer(product.png)) {
            pngBase64 = product.png.toString('base64');
        } else if (typeof product.png === 'string') {
            // 检查是否已经是base64字符串（简单判断）
            // 如果不是base64，转为Buffer再转base64
            try {
                Buffer.from(product.png, 'base64');
                pngBase64 = product.png;
            } catch (e) {
                pngBase64 = Buffer.from(product.png).toString('base64');
            }
        } else {
            pngBase64 = null;
        }
    }
    res.send({ id, pngBase64 });
}
// 通过用户名获取该用户所有订单详细（jwt认证前提下）
async function getOrdersByUsername(req, res) {
    const username = req.body?.username || req.query?.username;
    if (!username) {
        return res.status(400).send({ success: false, message: '缺少用户名' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        // 查询用户id
        const [userRows] = await connection.execute(
            `SELECT id FROM users WHERE username = ?`, [username]
        );
        if (userRows.length === 0) {
            return res.status(404).send({ success: false, message: '用户不存在' });
        }
        const userId = userRows[0].id;
        // 查询订单
        const [orders] = await connection.execute(
            `SELECT order_id, user_id, order_sn, order_status, total_amount, pay_amount, freight_amount, pay_type, pay_time, delivery_time, receive_time, close_time, create_time, update_time, remark, receiver_name, receiver_phone, receiver_address, delivery_company, delivery_sn, merchantId FROM orders WHERE user_id = ? ORDER BY create_time DESC`,
            [userId]
        );
        res.send({ success: true, orders });
    } catch (err) {
        console.error('[获取用户订单失败]', err);
        res.status(500).send({ success: false, message: '获取用户订单失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}


// 获取所有商品，随机选取50个商品（不足50则全部返回）
async function getRandomShopProducts(req, res) {
    const connection = await getDbConnection();
    // 查询所有商品id
    const [idRows] = await connection.execute(`SELECT id FROM ${shoptable}`);
    if (idRows.length === 0) {
        res.send([]);
        return;
    }
    // 随机打乱id
    const allIds = idRows.map(row => row.id);
    for (let i = allIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }
    const pickIds = allIds.slice(0, 50);
    // 查询选中的商品详细信息
    const placeholders = pickIds.map(() => '?').join(',');
    const sql = `SELECT id, name, price, datail, belong, createdata, comment, purchaseint, features, png, discount FROM ${shoptable} WHERE id IN (${placeholders})`;
    const [rows] = await connection.execute(sql, pickIds);
    // 图片转base64（兼容二进制和已是base64字符串的情况）
    const products = rows.map(product => {
        if (product.png) {
            if (Buffer.isBuffer(product.png)) {
                product.pngBase64 = product.png.toString('base64');
            } else if (typeof product.png === 'string') {
                product.pngBase64 = product.png;
            } else {
                product.pngBase64 = null;
            }
        } else {
            product.pngBase64 = null;
        }
        delete product.png;
        return product;
    });
    res.send(products);
}

// 插入商品函数
async function insertShopProduct() {
    const connection = await getDbConnection();
    // product: { name, price, datail, belong, createdata, comment, purchaseint, pngBase64 }
    // pngBase64: base64字符串（不带data:image/png;base64,前缀）
    const sql = `INSERT INTO ${shoptable} 
        (name, price, datail, belong, createdata, comment, purchaseint, png, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    // 将base64转为Buffer
    let pngBuffer = null;
    if (product.pngBase64) {
        pngBuffer = Buffer.from(product.pngBase64, 'base64');
    }
    const params = [
        product.name,
        product.price,
        product.datail,
        product.belong,
        product.createdata,      // 建议为 new Date() 或字符串
        product.comment,
        product.purchaseint,
        pngBuffer,
        product.features
    ];
    const [result] = await connection.execute(sql, params);
    return result.insertId;
}

/**
 * 根据ID获取商品信息（内部使用，不发送响应）
 * @param {number|string} productId - 商品ID
 * @returns {Promise<Object|null>} 商品信息或null
 */
async function getProductById(productId) {
  if (!productId) {
    return null;
  }
  
  let connection;
  try {
    connection = await getDbConnection();
    const sql = `SELECT discount, id, name, price, datail, belong, createdata, comment, purchaseint, png FROM ${shoptable} WHERE id = ?`;
    const [rows] = await connection.execute(sql, [productId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    const product = rows[0];
    if (product.png) {
      product.pngBase64 = product.png.toString('base64');
    } else {
      product.pngBase64 = null;
    }
    delete product.png;
    
    return product;
  } catch (error) {
    console.error('获取商品信息失败:', error);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}

// 根据id查询单个商品，图片以base64字符串返回
async function getShopProductById(req, res) {
    const connection = await getDbConnection();
    // 兼容 GET/POST，优先 body
    const id =req.body?.id ?? req.query?.id ?? req.body?.productId;
    if (!id) {
        res.status(400).send({ error: '缺少商品id' });
        return;
    }
    const sql = `SELECT discount, id, name, price, datail, belong, createdata, comment, purchaseint, png FROM ${shoptable} WHERE id = ?`;
    const [rows] = await connection.execute(sql, [id]);
    if (rows.length === 0) {
        res.status(404).send({ error: '未找到商品' });
        return;
    }
    const product = rows[0];
    if (product.png) {
        product.pngBase64 = product.png.toString('base64');
    } else {
        product.pngBase64 = null;
    }
    delete product.png;
    res.send(product);
    return product;
}

// 根据商品名称查询商品信息
async function getShopProductByName(req, res) {
    const name = req.body?.name || req.query?.name;
    if (!name) {
        return res.status(400).send({ success: false, message: '缺少商品名称' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        // 模糊匹配商品名称，优先完全匹配
        const [rows] = await connection.execute(
            `SELECT id, name, price, datail, belong, createdata, comment, purchaseint, discount, png FROM ${shoptable} WHERE name LIKE ? ORDER BY CASE WHEN name = ? THEN 0 ELSE 1 END LIMIT 1`,
            [`%${name}%`, name]
        );
        if (rows.length === 0) {
            return res.status(404).send({ success: false, message: '商品不存在' });
        }
        const product = rows[0];
        // 处理图片数据
        if (product.png) {
            product.pngBase64 = product.png.toString('base64');
        } else {
            product.pngBase64 = null;
        }
        delete product.png;
        console.log('[getShopProductByName] 查询结果:', product);
        res.send(product);
    } catch (err) {
        console.error('[getShopProductByName] 错误:', err);
        res.status(500).send({ success: false, message: '查询商品信息失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = {
    insertShopProduct,
    getShopProductById,
    getShopProductImageById,
    getRandomShopProducts,
    getOrdersByUsername,
    getShopProductByName,
    rechargeWallet,
    getProductById
};