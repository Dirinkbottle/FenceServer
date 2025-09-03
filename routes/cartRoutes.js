/**
 * 购物车相关路由
 */
const express = require('express');
const router = express.Router();
const { checkLogin } = require('../middleware/auth');
const cartapi = require('../cartapi');

// 获取购物车
router.post('/', checkLogin, cartapi.getCartDetail);

// 添加/清空 商品到购物车
router.post('/addOrCleanCart', checkLogin, cartapi.addOrCleanCart);

// 更新购物车商品
router.post('/update', checkLogin, cartapi.updateCartItem);



// 结算购物车
router.post('/checkout', checkLogin, cartapi.checkoutCart);

module.exports = router; 