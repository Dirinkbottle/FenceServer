/**
 * 商店相关路由
 */
const express = require('express');
const router = express.Router();
const { checkLogin } = require('../middleware/auth');
const shopapi = require('../shopapi');

// 获取商品列表
router.get('/products', shopapi.getRandomShopProducts);

// 根据商品名称查询
router.get('/product/name/:name', (req, res) => {
  req.query.name = req.params.name;
  return shopapi.getShopProductByName(req, res);
});

// 获取商品图片
router.post('/product/image', (req, res) => {
  return shopapi.getShopProductImageById(req, res);
});

// 获取商品详情
router.get('/product/:id', (req, res) => {
  req.query.id = req.params.id;
  return shopapi.getShopProductById(req, res);
});

module.exports = router; 