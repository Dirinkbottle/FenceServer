const { alipaySdk, TRADE_STATUS_MAP, logDebug } = require('./alipayCore.js');
const { generateOrderNumber } = require('../utils.js');
const {getProductById} = require('../shopapi.js');
const {createOrderByProductIdAndUsername} = require('../orderapi.js');
const { getDbConnection } = require('../normalapi.js');
const crypto = require('crypto');

async function alipayOrderPay(req, res) {
  try {
    //基础数据初始化
    const {reqtype, productId,username,sumbuy} = req.body;
    const fixedOrderId = generateOrderNumber();//第一次初始化
    const outTradeNo = fixedOrderId;//固定订单号 保持入库，订单一致
    console.log('支付宝订单支付请求:', req.body);
    if(!productId || !username || !sumbuy){//别去判断reqtype，因为0就是假值
      return res.json({
        success:false,
        message:"参数丢失",
      });
    }
    //sumby为>=1的整数
    if(sumbuy<1 || !Number.isInteger(Number(sumbuy))){
      return res.json({
        success:false,
        message:"sumbuy必须为>=1的整数",
      });
    }

    if(reqtype ==1){
      //钱包支付
      const charge=req.body.charge;
      //charge>=0.01
      if(charge<0.01){
        return res.json({
          success:false,
          message:"charge必须>=0.01",
        });
      }

   //预入库订单
   req.body.order_id=outTradeNo;
   req.body.is_wallet_recharge=true;
   req.body.pay_type=2;
   req.body.product_id = '9999'; // 钱包充值固定商品ID
   req.body.charge_amount = charge; // 确保充值金额正确传递
   const order=await createOrderByProductIdAndUsername(req,res,false);
   console.log(order);
   
      const result = await alipaySdk.sdkExecute("alipay.trade.app.pay", {
        bizContent: {
          out_trade_no: outTradeNo,
          total_amount: charge.toFixed(2),
          subject: "钱包充值",
          notify_url:process.env.ALIPAY_NOTIFY_URL,
          goods_detail: [
            {
              goods_name: "钱包充值",
              quantity: 1,
              price: charge.toFixed(2),
            },
          ],
          passback_params:{
            username:username,
            productId:'9999',
            sumbuy:1,
            charge:charge,
            outTradeNo:outTradeNo,
            
          },
        },
      });
      if(result){
        return res.json({
          success:true,
          orderSn:outTradeNo,
          result:result,
          message:"alipay订单创建成功",
        });
      }else{
        return res.json({
          success:false,
          message:"alipay订单创建失败",
        });
      }
    }else if(reqtype ==0){
      //产品支付
      //使用不发送响应的方法获取产品信息
      const product = await getProductById(productId);
      
      if (!product) {
        return res.json({
          success: false,
          message: `商品ID ${productId} 不存在`
        });
      }
      
      const discount = product.discount || 10; //折扣 比如 9 代表9折，默认10折
      const orignprice = product.price;
      //计算折扣价
      const price = (orignprice * sumbuy * discount / 10).toFixed(2);
      const subject = product.name;
      const detail = product.datail; //数据库写错了，懒得改了
      //预入库订单
      req.body.is_wallet_recharge=false;
      req.body.order_id=outTradeNo;
      req.body.pay_type=2;
      const order=await createOrderByProductIdAndUsername(req,res,false);
      console.log(order);
      const result = await alipaySdk.sdkExecute("alipay.trade.app.pay", {
        bizContent: {
          out_trade_no: outTradeNo,
          total_amount: price,
          subject: subject,
          notify_url:process.env.ALIPAY_NOTIFY_URL,
          goods_detail: [
            {
              goods_name: subject,
              quantity: sumbuy,
              price: price,
            },
          ],
          passback_params:{
            username:username,
            productId:productId,
            sumbuy:sumbuy,
            price:price,
            discount:discount,
            subject:subject,
            detail:detail,
            outTradeNo:outTradeNo,
            
          },
        },
      });
      
      if(result){
        return res.json({
          success:true,
          orderSn:outTradeNo,
          result:result,
          message:"alipay订单创建成功",
        });
      }else{
        return res.json({
          success:false,
          message:"alipay订单创建失败",
        });
      }
    }
  } catch (error) {
    console.error('支付宝订单支付异常:', error.message);
    return res.status(500).json({
      success: false,
      message: '处理支付请求失败',
      error: error.message
    });
  }
}

async function orderPreRecord(req,res){
  await createOrderByProductIdAndUsername(req,res);
}

/**
 * 处理支付宝异步通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function handleAlipayNotify(req, res) {
  try {
    console.log('[支付宝异步通知] 收到通知:', req.body);
    
    // 1. 获取异步通知参数
    const params = req.body;
    
    // 2. 验证签名 - 先尝试手动验签，如果失败再尝试SDK验签
    let isSignValid = verifyAlipaySign(params);
    
    // 如果手动验签失败，尝试使用SDK验签
    if (!isSignValid) {
      console.log('[支付宝异步通知] 手动验签失败，尝试SDK验签');
      isSignValid = await verifyAlipaySignWithSdk(params);
    }
    
    if (!isSignValid) {
      console.error('[支付宝异步通知] 签名验证失败');
      return res.status(400).send('fail');
    }
    
    console.log('[支付宝异步通知] 签名验证成功');
    
    // 3. 处理业务逻辑
    const {
      trade_no,           // 支付宝交易号
      out_trade_no,       // 商户订单号
      total_amount,       // 订单金额
      trade_status,       // 交易状态
      gmt_payment,        // 交易付款时间
      buyer_id,           // 买家支付宝用户号
      seller_id,          // 卖家支付宝用户号
      app_id              // 应用ID
    } = params;
    
    // 验证appId是否匹配
    if (app_id !== process.env.ALIPAY_APP_ID_PRODUCTION) {
      console.error('[支付宝异步通知] AppID不匹配');
      return res.status(400).send('fail');
    }
    
    // 根据交易状态更新订单
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      // 交易成功，更新订单状态
      const orderStatus = TRADE_STATUS_MAP[trade_status];
      await updateOrderStatus(out_trade_no, orderStatus, trade_no, gmt_payment);
      
      // 如果是钱包充值，处理充值逻辑
      if (params.passback_params) {
        try {
          // 解析passback_params
          const passbackParams = JSON.parse(decodeURIComponent(params.passback_params));
          if (passbackParams.charge) {
            // 是钱包充值订单
            await handleWalletRecharge(passbackParams, total_amount);
          }
        } catch (err) {
          console.error('[支付宝异步通知] 处理passback_params失败:', err);
        }
      }
    }
    
    // 4. 返回成功响应
    res.send('success');
  } catch (error) {
    console.error('[支付宝异步通知] 处理异常:', error);
    res.status(500).send('fail');
  }
}

/**
 * 验证支付宝异步通知签名
 * @param {Object} params - 通知参数
 * @returns {boolean} 签名是否有效
 */
function verifyAlipaySign(params) {
  try {
    console.log('[验签] 开始验证签名，原始参数:', JSON.stringify(params));
    
    // 1. 获取签名和签名类型
    const sign = params.sign;
    const signType = params.sign_type;
    
    if (!sign || !signType) {
      console.error('[验签] 缺少签名或签名类型');
      return false;
    }
    
    // 2. 构建待验签的字符串
    const paramsToVerify = { ...params };
    delete paramsToVerify.sign;
    // 生活号异步通知需要保留sign_type，但普通支付通知不需要
    // 根据支付宝文档，验签时需要保留sign_type
    
    // 3. 先对所有待验签参数值进行URL解码
    const decodedParams = {};
    for (const key in paramsToVerify) {
      if (paramsToVerify[key] !== undefined && paramsToVerify[key] !== null && paramsToVerify[key] !== '') {
        // 确保对字符串类型进行解码
        if (typeof paramsToVerify[key] === 'string') {
          try {
            decodedParams[key] = decodeURIComponent(paramsToVerify[key]);
          } catch (e) {
            // 如果解码失败，保留原始值
            console.warn(`[验签] 参数 ${key} 解码失败，使用原始值`);
            decodedParams[key] = paramsToVerify[key];
          }
        } else {
          decodedParams[key] = paramsToVerify[key];
        }
      }
    }
    
    // 4. 对参数进行字典排序
    const sortedKeys = Object.keys(decodedParams).sort();
    
    // 5. 组装待验签字符串
    const stringToSign = sortedKeys.map(key => {
      // 如果值为空，则不参与签名
      if (decodedParams[key] === undefined || decodedParams[key] === null || decodedParams[key] === '') {
        return '';
      }
      return `${key}=${decodedParams[key]}`;
    }).filter(Boolean).join('&');
    
    console.log('[验签] 待验签字符串:', stringToSign);
    
    // 6. 使用支付宝SDK验证签名
    const verify = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1');
    verify.update(stringToSign, 'utf8');
    
    // 7. 使用支付宝公钥验证签名
    const publicKey = alipaySdk.config.alipayPublicKey;
    
    // 确保公钥格式正确
    let formattedKey = publicKey;
    if (!formattedKey.includes('-----BEGIN PUBLIC KEY-----')) {
      formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }
    
    const isValid = verify.verify(formattedKey, sign, 'base64');
    
    console.log('[验签] 验签结果:', isValid);
    return isValid;
  } catch (error) {
    console.error('[验签] 验证签名异常:', error);
    return false;
  }
}

/**
 * 使用支付宝SDK验证异步通知签名
 * @param {Object} params - 通知参数
 * @returns {Promise<boolean>} 签名是否有效
 */
async function verifyAlipaySignWithSdk(params) {
  try {
    console.log('[SDK验签] 开始使用SDK验证签名');
    
    // 使用SDK的验签方法
    const result = await alipaySdk.checkNotifySign(params);
    
    console.log('[SDK验签] SDK验签结果:', result);
    return result;
  } catch (error) {
    console.error('[SDK验签] SDK验证签名异常:', error);
    return false;
  }
}

/**
 * 更新订单状态
 * @param {string} orderId - 订单ID
 * @param {number} status - 订单状态
 * @param {string} tradeNo - 支付宝交易号
 * @param {string} payTime - 支付时间
 */
async function updateOrderStatus(orderId, status, tradeNo, payTime) {
  let connection;
  try {
    connection = await getDbConnection();
    
    // 查询订单是否存在
    const [orderRows] = await connection.execute(
      'SELECT * FROM orders WHERE order_id = ?', 
      [orderId]
    );
    
    if (orderRows.length === 0) {
      console.error(`[更新订单状态] 订单不存在: ${orderId}`);
      return;
    }
    
    const order = orderRows[0];
    
    // 如果订单已经是完成状态，不再更新
    if (order.order_status === 1 || order.order_status === 2) {
      console.log(`[更新订单状态] 订单已完成，无需更新: ${orderId}`);
      return;
    }
    
    // 更新订单状态 - 确保order_sn与order_id一致
    await connection.execute(
      'UPDATE orders SET order_status = ?, pay_time = ?, update_time = NOW() WHERE order_id = ?',
      [status, payTime, orderId]
    );
    
    console.log(`[更新订单状态] 订单 ${orderId} 状态更新为 ${status}`);
  } catch (error) {
    console.error('[更新订单状态] 失败:', error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 处理钱包充值
 * @param {Object} params - 回调参数
 * @param {string} amount - 充值金额
 */
async function handleWalletRecharge(params, amount) {
  const { username } = params;
  if (!username) {
    console.error('[钱包充值] 缺少用户名');
    return;
  }
  
  let connection;
  try {
    connection = await getDbConnection();
    
    // 更新用户余额
    const [result] = await connection.execute(
      'UPDATE users SET balance = balance + ? WHERE username = ?',
      [parseFloat(amount), username]
    );
    
    if (result.affectedRows === 0) {
      console.error(`[钱包充值] 用户不存在: ${username}`);
      return;
    }
    
    console.log(`[钱包充值] 用户 ${username} 充值 ${amount} 成功`);
  } catch (error) {
    console.error('[钱包充值] 失败:', error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = {
  alipayOrderPay,
  handleAlipayNotify,
  orderPreRecord
}









