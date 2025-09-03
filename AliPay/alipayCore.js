/**
 * 支付宝支付核心模块 - 提供SDK配置和基础功能
 */
const { AlipaySdk } = require("alipay-sdk");
require('dotenv').config();

// 调试模式标志
const DEBUG = process.env.DEBUG === 'true' || false;

// 创建支付宝SDK实例
const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID_PRODUCTION,
  privateKey: process.env.ALIPAY_PRIVATE_KEY_PRODUCTION,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY_PRODUCTION,
  gateway: process.env.ALIPAY_HOST_PRODUCTION || 'https://openapi.alipay.com/gateway.do',
 //通知在实例化时设置
  timeout: 5000, // 设置超时时间
});

// 验证SDK实例是否正确初始化
console.log('支付宝SDK初始化状态:', {
  hasAppId: !!alipaySdk.config.appId,
  hasGateway: !!alipaySdk.config.gateway,
  hasPrivateKey: !!alipaySdk.config.privateKey,
  hasAlipayPublicKey: !!alipaySdk.config.alipayPublicKey,
  sdkVersion: require('alipay-sdk/package.json').version
});

/**
 * 支付宝交易状态映射到系统订单状态
 */
const TRADE_STATUS_MAP = {
  WAIT_BUYER_PAY: 0,        // 交易创建，等待买家付款
  TRADE_CLOSED: 4,          // 未付款交易超时关闭，或支付完成后全额退款
  TRADE_SUCCESS: 1,         // 交易支付成功
  TRADE_FINISHED: 2,        // 交易结束，不可退款
};

/**
 * 日志输出函数
 * @param {string} title - 日志标题
 * @param {any} content - 日志内容
 */
function logDebug(title, content) {
  if (DEBUG) {
    console.log(`[ALIPAY] ${title}:`, typeof content === 'object' ? JSON.stringify(content, null, 2) : content);
  }
}

module.exports = {
  alipaySdk,
  TRADE_STATUS_MAP,
  logDebug
}; 