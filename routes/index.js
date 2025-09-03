/**
 * 路由索引文件 - 集中管理所有路由
 */
const express = require('express');
const router = express.Router();

// 导入各个模块的路由
const userRoutes = require('./userRoutes');
const orderRoutes = require('./orderRoutes');
const shopRoutes = require('./shopRoutes');
const paymentRoutes = require('./paymentRoutes');
const cartRoutes = require('./cartRoutes');
const normalRoutes = require('./normalRoutes');
const adminRoutes = require('./adminRoutes');

// 注册路由
router.use('/user', userRoutes);
router.use('/order', orderRoutes);
router.use('/shop', shopRoutes);
router.use('/payment', paymentRoutes);
router.use('/cart', cartRoutes);
router.use('/admin', adminRoutes);
router.use('/', normalRoutes);

module.exports = router; 