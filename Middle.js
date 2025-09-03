// adminAuthMiddleware.js
const jwt = require('jsonwebtoken');
const { getDbConnection } = require('./normalapi.js');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';




// 打印用户请求对象的中间件
function logUserRequest(req, res, next) {
    const now = new Date().toISOString();
    console.debug(`[${now}] ${req.method} ${req.originalUrl}`);
    // 只打印 req 的常用属性，避免循环引用
    const safeReq = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        query: req.query,
        body: req.body,
        params: req.params,
        ip: req.ip,
    };
    console.debug('Request:', JSON.stringify(safeReq, null, 2));
    next();
}

// 管理员认证中间件（数据库校验）
async function adminAuthMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: '未提供token', needLogin: true });
    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'token无效或已过期', needLogin: true });
    }
    // 数据库校验用户名的permission
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT permission FROM users WHERE username=?', [decoded.username]);
        await connection.end();
        if (!rows.length || rows[0].permission !== 1) {
            // 返回特殊字段，前端收到可自动跳转login
            return res.status(403).json({ error: '无管理员权限', needLogin: true });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(500).json({ error: '数据库校验失败', needLogin: true });
    }
}

module.exports = {
    logUserRequest,
    adminAuthMiddleware,
};
