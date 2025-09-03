// 购物车相关API
const { getDbConnection, getUserFieldsByname } = require('./normalapi.js');
const shoptable = process.env.Mysql_SHOP_TABLE;
const carttable = process.env.Mysql_CART_TABLE || 'cart';

// 添加/合并购物车
async function addOrCleanCart(req, res) {
    const username = req.body?.username || req.query?.username;
    const op = req.body?.op || req.query?.op; // 'create' 或 'clean'
    const cartArr = req.body?.cart || req.query?.cart;
    if (!username || !op) {
        return res.status(400).send({ success: false, message: '缺少用户名或操作类型' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        if (op === 'clean') {
            await connection.execute(
                `UPDATE ${carttable} SET cartcontent = '[]' WHERE belong = ?`, [username]
            );
            return res.send({ success: true, message: '购物车已清空' });
        } else if (op === 'create') {
            if (!cartArr) {
                return res.status(400).send({ success: false, message: '缺少购物车商品数组' });
            }
            let cartContentArr;
            if (typeof cartArr === 'string') {
                try {
                    cartContentArr = JSON.parse(cartArr);
                } catch (e) {
                    return res.status(400).send({ success: false, message: '购物车参数格式错误' });
                }
            } else {
                cartContentArr = cartArr;
            }
            if (!Array.isArray(cartContentArr) || cartContentArr.length === 0 || !cartContentArr.every(item => item && item.id && item.count && Number(item.count) > 0)) {
                return res.status(400).send({ success: false, message: '购物车商品数组格式错误，每项需包含id和count且数量大于0' });
            }
            // 先查原有购物车内容，合并，保留 order_id
            let oldArr = [];
            const [existRows] = await connection.execute(
                `SELECT cartcontent FROM ${carttable} WHERE belong = ?`, [username]
            );
            if (existRows.length > 0 && existRows[0].cartcontent) {
                try {
                    oldArr = JSON.parse(existRows[0].cartcontent);
                } catch (e) { oldArr = []; }
            }
            for (const item of cartContentArr) {
                const exist = oldArr.find(i => String(i.id) === String(item.id));
                if (exist) {
                    exist.count = Number(exist.count) + Number(item.count);
                    if (exist.order_id) item.order_id = exist.order_id; // 保留 order_id
                }
            }
            // 合并后，去重并保留 order_id
            const mergedArr = [];
            for (const item of cartContentArr) {
                const exist = mergedArr.find(i => String(i.id) === String(item.id));
                if (exist) {
                    exist.count += Number(item.count);
                } else {
                    // 查找 oldArr 是否有 order_id
                    const old = oldArr.find(i => String(i.id) === String(item.id));
                    mergedArr.push({
                        id: item.id,
                        count: Number(item.count),
                        ...(old && old.order_id ? { order_id: old.order_id } : {})
                    });
                }
            }
            const cartcontent = JSON.stringify(mergedArr);
            if (existRows.length > 0) {
                await connection.execute(
                    `UPDATE ${carttable} SET cartcontent = ? WHERE belong = ?`, [cartcontent, username]
                );
            } else {
                await connection.execute(
                    `INSERT INTO ${carttable} (belong, cartcontent) VALUES (?, ?)`, [username, cartcontent]
                );
            }
            return res.send({ success: true, message: '购物车已保存', cart: mergedArr });
        } else {
            return res.status(400).send({ success: false, message: '不支持的操作类型' });
        }
    } catch (err) {
        console.error('[添加/清空购物车失败]', err);
        res.status(500).send({ success: false, message: '添加/清空购物车失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}

// 添加购物车（兼容老接口）
async function addToCart(req, res) {
    const username = req.body?.username || req.query?.username;
    const cartArr = req.body?.cart || req.query?.cart;
    // debug: 打印请求体和参数
    let cartContentArr;
    if (typeof cartArr === 'string') {
        try {
            cartContentArr = JSON.parse(cartArr);
        } catch (e) {
            return res.status(400).send({ success: false, message: '购物车参数格式错误' });
        }
    } else {
        cartContentArr = cartArr;
    }
    console.log('[addToCart] 用户:', username, '购物车内容:', cartContentArr, '原始参数:', {
        body: req.body,
        query: req.query
    });
    if (!username || !cartArr) {
        return res.status(400).send({ success: false, message: '缺少用户名或购物车商品数组' });
    }
    if (!Array.isArray(cartContentArr) || cartContentArr.length === 0 || !cartContentArr.every(item => item && item.id && item.count && Number(item.count) > 0)) {
        return res.status(400).send({ success: false, message: '购物车商品数组格式错误，每项需包含id和count且数量大于0' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        // 保留原有 order_id
        let oldArr = [];
        const [existRows] = await connection.execute(
            `SELECT cartcontent FROM ${carttable} WHERE belong = ?`, [username]
        );
        if (existRows.length > 0 && existRows[0].cartcontent) {
            try {
                oldArr = JSON.parse(existRows[0].cartcontent);
            } catch (e) { oldArr = []; }
        }
        const mergedArr = [];
        for (const item of cartContentArr) {
            // 查找 oldArr 是否有 order_id
            const old = oldArr.find(i => String(i.id) === String(item.id));
            mergedArr.push({
                id: item.id,
                count: Number(item.count),
                ...(old && old.order_id ? { order_id: old.order_id } : {})
            });
        }
        const cartcontent = JSON.stringify(mergedArr);
        if (existRows.length > 0) {
            await connection.execute(
                `UPDATE ${carttable} SET cartcontent = ? WHERE belong = ?`, [cartcontent, username]
            );
        } else {
            await connection.execute(
                `INSERT INTO ${carttable} (belong, cartcontent) VALUES (?, ?)`, [username, cartcontent]
            );
        }
        const resp = { success: true, message: '购物车已保存', cart: mergedArr };
        console.log('[addToCart] 响应:', resp);
        res.send(resp);
    } catch (err) {
        console.error('[添加购物车失败]', err);
        const resp = { success: false, message: '添加购物车失败', error: err.message };
        console.log('[addToCart] 响应:', resp);
        res.status(500).send(resp);
    } finally {
        if (connection) await connection.end();
    }
}

// 获取购物车详细信息
async function getCartDetail(req, res) {
    const username = req.body?.username || req.query?.username;
    if (!username) {
        return res.status(400).send({ success: false, message: '缺少用户名' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        const [cartRows] = await connection.execute(
            `SELECT cartcontent FROM ${carttable} WHERE belong = ?`, [username]
        );
        if (cartRows.length === 0) {
            return res.send({ success: true, cart: [] });
        }
        let cartArr;
        try {
            cartArr = JSON.parse(cartRows[0].cartcontent);
        } catch (e) {
            return res.status(500).send({ success: false, message: '购物车内容解析失败' });
        }
        if (!Array.isArray(cartArr) || cartArr.length === 0) {
            return res.send({ success: true, cart: [] });
        }
        // 检查带 order_id 的商品是否已支付，已支付则移除
        let changed = false;
        for (let i = cartArr.length - 1; i >= 0; i--) {
            const item = cartArr[i];
            if (item.order_id) {
                const [orderRows] = await connection.execute(
                    `SELECT order_status FROM ${process.env.Mysql_ORDER_TABLE || 'orders'} WHERE order_id = ?`, [item.order_id]
                );
                
                if (orderRows.length > 0 && Number(orderRows[0].order_status) === 0) { // 0=没有支付
                    
                }
                
                if (orderRows.length > 0 && Number(orderRows[0].order_status) === 1) { // 1=已支付
                    cartArr.splice(i, 1);
                    changed = true;
                }
            }
        }
        if (changed) {
            await connection.execute(
                `UPDATE ${carttable} SET cartcontent = ? WHERE belong = ?`, [JSON.stringify(cartArr), username]
            );
        }
        if (cartArr.length === 0) return res.send({ success: true, cart: [] });
        const ids = cartArr.map(item => item.id);
        if (ids.length === 0) return res.send({ success: true, cart: [] });
        // 查询商品时带上 discount 字段
        const [products] = await connection.query(
            `SELECT id, name, price, png, discount FROM ${shoptable} WHERE id IN (${ids.map(() => '?').join(',')})`, ids
        );
        const cartDetail = cartArr.map(item => {
            const product = products.find(p => String(p.id) === String(item.id));
            return product ? {
                id: product.id,
                name: product.name,
                price: product.price,
                png: product.png ? (Buffer.isBuffer(product.png) ? product.png.toString('base64') : product.png) : null,
                discount: product.discount, // 新增折扣字段
                count: item.count,
                order_id: item.order_id || null
            } : null;
        }).filter(Boolean);
        res.send({ success: true, cart: cartDetail });
        console.debug('[获取购物车详情]', { username, cart: cartDetail });
    } catch (err) {
        console.error('[获取购物车详情失败]', err);
        res.status(500).send({ success: false, message: '获取购物车详情失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}

// 实时修改购物车商品数量
async function updateCartItem(req, res) {
    const username = req.body?.username || req.query?.username;
    const productId = req.body?.id || req.query?.id;
    const op = req.body?.op || req.query?.op;
    let count = req.body?.count || req.query?.count;
    if (!username || !productId || !op) {
        return res.status(400).send({ success: false, message: '缺少用户名、商品id或操作类型' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        const [cartRows] = await connection.execute(
            `SELECT cartcontent FROM ${carttable} WHERE belong = ?`, [username]
        );
        let cartArr = [];
        if (cartRows.length > 0 && cartRows[0].cartcontent) {
            try {
                cartArr = JSON.parse(cartRows[0].cartcontent);
            } catch (e) {
                return res.status(500).send({ success: false, message: '购物车内容解析失败' });
            }
        }
        let found = false;
        cartArr = cartArr.map(item => {
            if (String(item.id) === String(productId)) {
                found = true;
                let newCount = Number(item.count);
                if (op === 'inc') {
                    newCount = Number(item.count) + 1;
                } else if (op === 'dec') {
                    newCount = Math.max(1, Number(item.count) - 1);
                } else if (op === 'set') {
                    newCount = Math.max(1, Number(count));
                }
                return { ...item, count: newCount };
            }
            return item;
        });
        if (!found && op === 'inc') {
            cartArr.push({ id: productId, count: 1 });
        }
        cartArr = cartArr.filter(item => Number(item.count) > 0);
        const cartcontent = JSON.stringify(cartArr);
        if (cartRows.length > 0) {
            await connection.execute(
                `UPDATE ${carttable} SET cartcontent = ? WHERE belong = ?`, [cartcontent, username]
            );
        } else {
            await connection.execute(
                `INSERT INTO ${carttable} (belong, cartcontent) VALUES (?, ?)`, [username, cartcontent]
            );
        }
        res.send({ success: true, cart: cartArr });
    } catch (err) {
        console.error('[实时修改购物车失败]', err);
        res.status(500).send({ success: false, message: '实时修改购物车失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}

// 购物车结算
async function checkoutCart(req, res) {
    const username = req.body?.username || req.query?.username;
    if (!username) {
        return res.status(400).send({ success: false, message: '缺少用户名' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        const [cartRows] = await connection.execute(
            `SELECT cartcontent FROM ${carttable} WHERE belong = ?`, [username]
        );
        if (cartRows.length === 0 || !cartRows[0].cartcontent) {
            return res.status(400).send({ success: false, message: '购物车为空' });
        }
        let cartArr;
        try {
            cartArr = JSON.parse(cartRows[0].cartcontent);
        } catch (e) {
            return res.status(500).send({ success: false, message: '购物车内容解析失败' });
        }
        if (!Array.isArray(cartArr) || cartArr.length === 0) {
            return res.status(400).send({ success: false, message: '购物车为空' });
        }
        const orderIds = [];
        for (const item of cartArr) {
            if (item.order_id) {
                // 检查订单是否还存在，若存在则复用，不再新建
                const [orderRows] = await connection.execute(
                    `SELECT order_id FROM ${process.env.Mysql_ORDER_TABLE || 'orders'} WHERE order_id = ?`, [item.order_id]
                );
                if (orderRows.length > 0) {
                    orderIds.push(item.order_id);
                    continue;
                } else {
                    // 订单号失效，重新分配
                    delete item.order_id;
                }
            }
            // 新建订单
            const [productRows] = await connection.execute(
                `SELECT id, name, price, belong, discount, png FROM ${shoptable} WHERE id = ?`,
                [item.id]
            );
            if (productRows.length === 0) continue;
            const product = productRows[0];
            const prdunctname = product.name || '';
            const userResult = await getUserFieldsByname(username);
            if (!userResult.success) continue;
            const userId = userResult.user.id;
            const receiver_address = userResult.user.address || '';
            const receiver_phone = userResult.user.phone || '';
            const receiver_name = userResult.user.realname || username;
            const merchantResult = await getUserFieldsByname(product.belong);
            if (!merchantResult.success) continue;
            const merchantId = merchantResult.user.id;
            const order_id = Math.random().toString().slice(2, 12);
            let discount = Number(product.discount);
            if (isNaN(discount) || discount === 0) discount = 1.0;
            if (discount > 1) discount = discount / 10;
            const unit_price = Number(product.price);
            const total_amount = unit_price * item.count;
            const pay_amount = unit_price * discount * item.count;
            const now = new Date();
            const params = [
                order_id,
                userId,
                order_id,
                0,
                total_amount,
                pay_amount,
                0,
                0,
                null,
                null,
                null,
                null,
                now,
                now,
                '',
                receiver_name,
                receiver_phone,
                receiver_address,
                '',
                '',
                merchantId,
                item.count,
                prdunctname,
                item.id
            ];
            const sql = `INSERT INTO ${process.env.Mysql_ORDER_TABLE || 'orders'} (
                order_id,user_id, order_sn, order_status, total_amount, pay_amount, freight_amount, pay_type,
                pay_time, delivery_time, receive_time, close_time, create_time, update_time, remark,
                receiver_name, receiver_phone, receiver_address, delivery_company, delivery_sn, merchantId, sumbuy, prdunctname, product_id
            ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            await connection.execute(sql, params);
            item.order_id = order_id; // 写回购物车
            orderIds.push(order_id);
        }
        // 写回购物车（不清空，等待支付后自动清理）
        await connection.execute(
            `UPDATE ${carttable} SET cartcontent = ? WHERE belong = ?`, [JSON.stringify(cartArr), username]
        );
        const orders = [];
        for (const oid of orderIds) {
            const [orderRows] = await connection.execute(
                `SELECT * FROM ${process.env.Mysql_ORDER_TABLE || 'orders'} WHERE order_id = ?`, [oid]
            );
            if (orderRows.length > 0) orders.push(orderRows[0]);
        }
        res.send({ success: true, orders });
    } catch (err) {
        console.error('[结算购物车失败]', err);
        res.status(500).send({ success: false, message: '结算购物车失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = {
    addOrCleanCart,
    addToCart,
    getCartDetail,
    updateCartItem,
    checkoutCart,
};
