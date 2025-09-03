// 订单相关API
const { getDbConnection, getUserFieldsByname } = require('./normalapi.js');
const shoptable = process.env.Mysql_SHOP_TABLE;
const ordertable = process.env.Mysql_ORDER_TABLE || 'orders';
// 使用新的工具模块，移除对alipayOrderApi.js的依赖
const { generateOrderNumber } = require('./utils.js');

// 创建订单（单商品）
async function createOrderByProductIdAndUsername(req, res, sendResponse = true) {

    const productId = req.body?.product_id || req.query?.product_id || req.body?.productId;
    const username = req.body?.username || req.query?.username;
    const sumbuy = Number(req.body?.sumbuy || req.query?.sumbuy || 1);
    const pay_type = Number(req.body?.pay_type || req.query?.pay_type || 0);
    // 允许传入自定义订单号，如果未传入则自动生成
    const customOrderId = req.body?.order_id || req.query?.order_id;
    // 检查是否为钱包充值订单
    const isWalletRecharge = req.body?.is_wallet_recharge || req.query?.is_wallet_recharge;
    const chargeAmount = Number(req.body?.charge || req.body?.charge_amount || req.query?.charge_amount || 0);
    
    console.log('[订单创建] 参数:', {
        productId, username, sumbuy, pay_type, customOrderId, isWalletRecharge, chargeAmount
    });
    
    if (!productId && !isWalletRecharge) {
        const result = { success: false, message: '缺少商品id或用户名' };
        if (sendResponse) {
            return res.status(400).send(result);
        }
        return result;
    }
    if (!username) {
        const result = { success: false, message: '缺少用户名' };
        if (sendResponse) {
            return res.status(400).send(result);
        }
        return result;
    }
    if (isNaN(sumbuy) || sumbuy < 1) {
        const result = { success: false, message: '购买数量非法' };
        if (sendResponse) {
            return res.status(400).send(result);
        }
        return result;
    }
    
    // 如果是钱包充值订单，验证充值金额
    if (isWalletRecharge && (isNaN(chargeAmount) || chargeAmount <= 0)) {
        const result = { success: false, message: '充值金额非法' };
        if (sendResponse) {
            return res.status(400).send(result);
        }
        return result;
    }
    
    let connection;
    try {
        connection = await getDbConnection();
        
        // 处理商品信息
        let product = null;
        let merchantId = null;
        
        if (isWalletRecharge) {
            // 钱包充值不需要查询实际商品，使用系统预设值
            product = {
                id: '9999', // 钱包充值固定商品ID为9999
                name: '钱包充值',
                price: chargeAmount,
                discount: 1.0,
                belong: 'admin' // 系统管理员作为收款方
            };
            
            // 获取系统管理员ID作为收款人
            const merchantResult = await getUserFieldsByname('admin');
            if (!merchantResult.success) {
                const result = { success: false, message: '系统管理员账户不存在' };
                if (sendResponse) {
                    return res.status(404).send(result);
                }
                return result;
            }
            merchantId = merchantResult.user.id;
            
        } else {
            // 普通商品购买，查询商品信息
        const [productRows] = await connection.execute(
            `SELECT id, name, price, belong, discount, png FROM ${shoptable} WHERE id = ?`,
            [productId]
        );
        if (productRows.length === 0) {
            const result = { success: false, message: '商品不存在' };
            if (sendResponse) {
                return res.status(404).send(result);
            }
            return result;
        }
            product = productRows[0];
            
            // 查 belong 对应的收款人id
            const merchantResult = await getUserFieldsByname(product.belong);
            if (!merchantResult.success) {
                const result = { success: false, message: '商家不存在' };
                if (sendResponse) {
                    return res.status(404).send(result);
                }
                return result;
            }
            merchantId = merchantResult.user.id;
        }
        
        // 商品名
        const prdunctname = product.name || '';
        
        // 查下单用户信息
        const userResult = await getUserFieldsByname(username);
        if (!userResult.success) {
            const result = { success: false, message: '用户不存在' };
            if (sendResponse) {
                return res.status(404).send(result);
            }
            return result;
        }
        const userId = userResult.user.id;
        const receiver_address = userResult.user.address || '';
        const receiver_phone = userResult.user.phone || '';
        const receiver_name = userResult.user.realname || username;
        // 生成订单号 - 使用工具模块中的generateOrderNumber函数
        const order_id = customOrderId || generateOrderNumber();
        
        // 计算金额和折扣
        let discount = Number(product.discount);
        if (isNaN(discount) || discount === 0) discount = 1.0;
        if (discount > 1) discount = discount / 10;
        
        // 钱包充值订单使用固定金额，普通商品订单计算价格
        const unit_price = isWalletRecharge ? chargeAmount : Number(product.price);
        const total_amount = isWalletRecharge ? chargeAmount : unit_price * sumbuy;
        const pay_amount = isWalletRecharge ? chargeAmount : unit_price * discount * sumbuy;
        
        // 6. 组装订单参数（去除 productimg 字段，顺序与表结构一致，order_id自增不传）
        const now = new Date();
        const params = [
            order_id,// order_id
            userId, // user_id
            order_id, // order_sn
            0, // order_status
            total_amount, // total_amount
            pay_amount, // pay_amount
            0, // freight_amount
            pay_type, // pay_type
            null, // pay_time
            null, // delivery_time
            null, // receive_time
            null, // close_time
            now, // create_time
            now, // update_time
            isWalletRecharge ? '钱包充值' : '', // remark
            receiver_name, // receiver_name
            receiver_phone, // receiver_phone
            receiver_address, // receiver_address
            '', // delivery_company
            '', // delivery_sn
            merchantId, // merchantId
            sumbuy, // sumbuy
            prdunctname, // prdunctname
            isWalletRecharge ? '9999' : productId //productid - 钱包充值固定为9999
        ];
        const sql = `INSERT INTO ${ordertable} (
            order_id,user_id, order_sn, order_status, total_amount, pay_amount, freight_amount, pay_type,
            pay_time, delivery_time, receive_time, close_time, create_time, update_time, remark,
            receiver_name, receiver_phone, receiver_address, delivery_company, delivery_sn, merchantId, sumbuy, prdunctname, product_id
        ) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await connection.execute(sql, params);
        const result = { success: true, message: '订单创建成功', order_id };
        console.log('[createOrderByProductIdAndUsername] 响应:', result);
        
        if (sendResponse) {
            res.send(result);
        }
        return result;
    } catch (err) {
        console.error('[订单创建失败]', err);
        const result = { success: false, message: '订单创建失败', error: err.message };
        console.log('[createOrderByProductIdAndUsername] 响应:', result);
        
        if (sendResponse) {
            res.status(500).send(result);
        }
        return result;
    } finally {
        if (connection) await connection.end();
    }
}

// 订单支付
async function purchaseOrderById(req, res) {
    // debug: 打印请求体和参数
    console.log('[purchaseOrderById] 请求参数:', {
        body: req.body,
        query: req.query
    });
    const orderId = req.body?.order_id || req.query?.order_id;
    if (!orderId) {
        return res.status(400).send({ success: false, message: '缺少订单id' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        // 查询订单
        const [orderRows] = await connection.execute(
            `SELECT * FROM ${ordertable} WHERE order_id = ?`, [orderId]
        );
        if (orderRows.length === 0) {
            return res.status(404).send({ success: false, message: '订单不存在' });
        }
        const order = orderRows[0];
        if (order.order_status !== 0) {
            return res.status(400).send({ success: false, message: '订单状态不允许购买' });
        }
        // 查询购买人和收款人余额
        const [buyerRows] = await connection.execute(
            `SELECT id, balance FROM users WHERE id = ?`, [order.user_id]
        );
        const [sellerRows] = await connection.execute(
            `SELECT id, balance FROM users WHERE id = ?`, [order.merchantId]
        );
        if (buyerRows.length === 0 || sellerRows.length === 0) {
            return res.status(404).send({ success: false, message: '用户信息异常' });
        }
        const buyer = buyerRows[0];
        const seller = sellerRows[0];
        const amount = Number(order.pay_amount);
        if (Number(buyer.balance) < amount) {
            return res.status(400).send({ success: false, message: '余额不足' });
        }
        // 扣款和转账（开启事务）
        await connection.beginTransaction();
        await connection.execute(
            `UPDATE users SET balance = balance - ? WHERE id = ?`, [amount, buyer.id]
        );
        await connection.execute(
            `UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, seller.id]
        );
        await connection.execute(
            //pay_type 1 表示钱包支付，order_status 1 表示已完成
            `UPDATE ${ordertable} SET order_status = 1, pay_type = 1, pay_time = NOW(), update_time = NOW() WHERE order_id = ?`, [orderId]
        );
        await connection.commit();
    const resp = { success: true, message: '支付成功，订单已完成' };
    console.log('[purchaseOrderById] 响应:', resp);
    res.send(resp);
    } catch (err) {
        if (connection) try { await connection.rollback(); } catch(e){}
        console.error('[购买订单失败]', err);
        const resp = { success: false, message: '支付失败', error: err.message };
        console.log('[purchaseOrderById] 响应:', resp);
        res.status(500).send(resp);
    } finally {
        if (connection) await connection.end();
    }
}

// 订单详情
async function getOrderDetailById(req, res) {
    const orderId = req.body?.order_id || req.query?.order_id;
    if (!orderId) {
        return res.status(400).send({ success: false, message: '缺少订单id' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        const [orderRows] = await connection.execute(
            `SELECT * FROM ${ordertable} WHERE order_id = ?`, [orderId]
        );
        if (orderRows.length === 0) {
            return res.status(404).send({ success: false, message: '订单不存在' });
        }
        const order = orderRows[0];
        // 显式输出所有字段，防止部分字段被省略
        console.log('[订单详情返回]', order);
        res.send({ success: true, order });
    } catch (err) {
        console.error('[获取订单详情失败]', err);
        res.status(500).send({ success: false, message: '获取订单详情失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}

// 销毁订单
async function destroyOrderById(req, res) {
    const orderId = req.body?.order_id || req.query?.order_id;
    if (!orderId) {
        return res.status(400).send({ success: false, message: '缺少订单id' });
    }
    let connection;
    try {
        connection = await getDbConnection();
        const [result] = await connection.execute(
            `DELETE FROM ${ordertable} WHERE order_id = ?`, [orderId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).send({ success: false, message: '订单不存在或已被删除' });
        }
        const resp = { success: true, message: '订单已销毁', order_id: orderId };
        console.log('[destroyOrderById] 响应:', resp);
        res.send(resp);
    } catch (err) {
        if (connection) await connection.end();
        console.error('[销毁订单失败]', err);
        const resp = { success: false, message: '销毁订单失败', error: err.message };
        console.log('[destroyOrderById] 响应:', resp);
        res.status(500).send(resp);
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = {
    createOrderByProductIdAndUsername,
    purchaseOrderById,
    getOrderDetailById,
    destroyOrderById,
};
