// 依赖 mysql2 和 dotenv
const mysql = require('mysql2/promise');
require('dotenv').config();
//JWT认证系统
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // 建议放到 .env
//用户头像上传
const path = require('path');
const fs = require('fs');
const e = require('express');
// 更新用户收货地址（jwt认证前提）
async function updateUserAddressOrPhone(req, res) {
    const username = req.body?.username || req.query?.username;
    let address = req.body?.address || req.query?.address;
    let phone = req.body?.phone || req.query?.phone;
    const location = req.body?.location || req.query?.location; // 新增自动定位字段
    if (!username) {
        return errorres(res, '缺少用户名');
    }
    // 校验和处理地址
    if (address) {
        address = address.trim();
        if (address.length < 5 || address.length > 100) {
            return errorres(res, '收货地址长度需在5-100字符之间');
        }
        // 简单敏感词过滤示例
        const forbidden = ['测试', '假地址', '非法'];
        if (forbidden.some(word => address.includes(word))) {
            return errorres(res, '收货地址包含非法内容');
        }
        // 自动定位功能：如有 location 字段，拼接到地址
        if (location && typeof location === 'string' && location.length > 0) {
            address += `（定位：${location}）`;
        }
    }
    // 校验和处理手机号
    if (phone) {
        //phone为空就不更新
        if (phone === '') {
            phone = null;
        } else {
            phone = phone.trim();
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                return errorres(res, '手机号格式不正确');
            }
        }
    }
    let connection;
    try {
        connection = await getDbConnection();
        const table = process.env.Mysql_USER_TABLE;
        // 动态拼接 SQL 和参数
        let sql = `UPDATE \`${table}\` SET`;
        const sets = [];
        const params = [];
        if (address) {
            sets.push('address = ?');
            params.push(address);
        }
        if (phone) {
            sets.push('phone = ?');
            params.push(phone);
        }
        if (sets.length === 0) {
            return errorres(res, '未提供可更新的收货地址或手机号');
        }
        sql += ' ' + sets.join(', ') + ' WHERE username = ?';
        params.push(username);
        const [result] = await connection.execute(sql, params);
        if (result.affectedRows === 0) {
            return errorres(res, '用户不存在或更新失败');
        }
        res.send({ success: true, message: '信息更新成功', username, address: address || undefined, phone: phone || undefined });
    } catch (err) {
        if (connection) await connection.end();
        console.error('[更新收货地址/手机号失败]', err);
        errorres(res, '信息更新失败');
    } finally {
        if (connection) await connection.end();
    }
}
//用户普通字段获取
async function getUserFieldsByname(id) {
    //从数据库获取用户的id,password,username,email,address,phone等字段
    let connection;
    try {
        connection = await getDbConnection();
        const table = process.env.Mysql_USER_TABLE;
        // 可根据实际表结构调整字段
        const [rows] = await connection.execute(
            `SELECT address,phone, id, username, email, avatar, balance, avatar_updated_at FROM \`${table}\` WHERE username = ?`,
            [id]
        );
        if (rows.length === 0) {
            return { success: false, message: '用户不存在' };
        }
        // 不建议直接返回密码字段，实际生产环境应去除
        const user = rows[0];
        return { success: true, user };
    } catch (err) {
        if (connection) await connection.end();
        return { success: false, message: '获取用户字段失败' };
    } finally {
        if (connection) await connection.end();
    }
}

// 本地存储头像，更新数据库avatar字段，返回头像URL
async function uploadAvatar(req, res) {
    // 需要authMiddleware和multer的upload.single('avatar')配合
    if (!req.user || !req.user.username) {
        return errorres(res, 'token无效或缺少用户名');
    }
    if (!req.file) {
        return errorres(res, '未上传头像文件');
    }
    console.log('[DEBUG] 头像上传请求:', {
        user: req.user,
        file: req.file
    });
    const username = req.user.username;
    const ext = path.extname(req.file.originalname) || '.jpg';
    const userAvatarDir = path.join(__dirname, 'uploads', 'avatar', username);
    const avatarFileName = 'avatar' + ext;
    const destPath = path.join(userAvatarDir, avatarFileName);
    let connection;
    try {
        console.log('[DEBUG] 用户头像上传:', {
            username,
            ext,
            userAvatarDir,
            avatarFileName,
            destPath,
            file: req.file
        });
        // 确保用户文件夹存在
        if (!fs.existsSync(userAvatarDir)) {
            fs.mkdirSync(userAvatarDir, { recursive: true });
            console.log('[DEBUG] 创建用户头像目录:', userAvatarDir);
        }
        connection = await getDbConnection();
        const table = process.env.Mysql_USER_TABLE;
        // 查询上次上传时间
        const [rows] = await connection.execute(
            `SELECT avatar_updated_at FROM \`${table}\` WHERE username = ?`,
            [username]
        );
        let lastUpload = 0;
        if (rows.length && rows[0].avatar_updated_at) {
            lastUpload = new Date(rows[0].avatar_updated_at).getTime();
        }
        const now = Date.now();
        console.log('[DEBUG] 上次上传时间:', lastUpload, '当前时间:', now, '间隔(ms):', now - lastUpload);
        if (lastUpload && now - lastUpload < 30000) {
            await connection.end();
            // 删除刚上传的临时文件
            fs.unlinkSync(req.file.path);
            console.log('[DEBUG] 上传太频繁，已删除临时文件:', req.file.path);
            return errorres(res, '上传太频繁，请30秒后再试');
        }
        // 删除旧头像（如果存在）
        if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
            console.log('[DEBUG] 删除旧头像:', destPath);
        }
        // 移动新头像
        fs.renameSync(req.file.path, destPath);
        console.log('[DEBUG] 新头像已保存:', destPath);
        // 头像URL（可根据实际部署调整）
        const avatarUrl = `/uploads/avatar/${username}/${avatarFileName}`;
        // 更新数据库avatar字段和上传时间
        await connection.execute(
            `UPDATE \`${table}\` SET avatar = ?, avatar_updated_at = NOW() WHERE username = ?`,
            [avatarUrl, username]
        );
        await connection.end();
        console.log('[DEBUG] 数据库已更新头像URL:', avatarUrl);
        res.send({ success: true, url: avatarUrl });
    } catch (err) {
        if (connection) await connection.end();
        console.error('[DEBUG] 头像上传失败:', err);
        errorres(res, '头像上传失败');
    }
}

//wallet请求api
async function UserWallet(req, res) {
    // 这里假设 authMiddleware 已经在路由中间件链中
    const userJwt = req.user;
    if (!userJwt || !userJwt.username) {
        return errorres(res, 'token无效或缺少用户名');
    }
    let connection;
    try {
        connection = await getDbConnection();
        const table = process.env.Mysql_USER_TABLE;
        const [rows] = await dbQuery(
            connection,
            table,
            ['username', 'balance'],
            'username = ?',
            [userJwt.username]
        );
        if (rows.length === 0) {
            return errorres(res, '用户不存在');
        }
        const user = rows[0];
        res.send({
            success: true,
            user: user.username,
            balance: user.balance || 0,
            message: '获取用户钱包信息成功'
        });
    } catch (err) {
        errorres(res, {message: '获取用户钱包信息失败'});
    } finally {
        if (connection) await connection.end();
    }

}


//UserProfile请求api
// UserProfile 只作为路由处理函数，不要在这里手动调用中间件，否则会多次响应
// UserProfile：根据 JWT 中的用户名从数据库查询用户信息并返回

async function UserProfile(req, res) {
    // 这里假设 authMiddleware 已经在路由中间件链中
    const userJwt = req.user;
    if (!userJwt || !userJwt.username) {
        return errorres(res, {success: false, message: 'token无效或缺少用户名'});
    }
    let connection;
    try {
        connection = await getDbConnection();
        const table = process.env.Mysql_USER_TABLE;
        const [rows] = await dbQuery(
            connection,
            table,
            ['username', 'email', 'avatar', 'address', 'phone'],
            'username = ?',
            [userJwt.username]
        );
        if (rows.length === 0) {
            return errorres(res, '用户不存在');
            //返回详细错误
            console.error('[DEBUG] 用户不存在:', error);
        }
        const user = rows[0];
        res.send({
            success: true,
            user: user.username,
            email: user.email,
            avatar: user.avatar || null,
            address: user.address || '',
            phone: user.phone || '',
            message: '获取用户信息成功'
        });
    } catch (err) {
        errorres(res, {message: '获取用户信息失败'});
    } finally {
        if (connection) await connection.end();
    }
}


//api请求合法判断
function isValidRequest(req) {
}

// 通用错误响应
function errorres(res, msg = 'Invalid request') {
    res.send({ error: msg });
}

// 封装 JSON 解析，支持对象或字符串
function jsondecry(data) {
    if (typeof data === 'object' && data !== null) return data;
    if (typeof data === 'string') return JSON.parse(data);
    return {};
}

// 根路径检查（可自定义）
function RootCheck(req, res) {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
}

// 版本更新检查
function UpdateCheck(req, res) {
    // 优先支持直接传 version/build
    let clientVersion = req.body?.version || req.query.version;
    let clientBuild = req.body?.build || req.query.build;

    // 兼容 data 字段为对象或字符串
    const dataStr = req.query.data || req.body?.data;
    if ((!clientVersion || !clientBuild) && dataStr) {
        try {
            const jsonData = jsondecry(dataStr);
            clientVersion = jsonData.version;
            clientBuild = jsonData.build;
        } catch (e) {
            return errorres(res, 'JSON parse error');
        }
    }

    // 读取服务器端最新版本号和更新内容
    let latestVersion = '';
    let latestBuild = '';
    let changelog = '';
    try {
        const versionText = fs.readFileSync(require('path').join(__dirname, 'UpdateApk', 'version'), 'utf8');
        // 解析 version 文件内容
        // 支持格式: version:1.0\nbuild:1.0
        const versionMatch = versionText.match(/version:([^\r\n]+)/);
        const buildMatch = versionText.match(/build:([^\r\n]+)/);
        latestVersion = versionMatch ? versionMatch[1].trim() : '';
        latestBuild = buildMatch ? buildMatch[1].trim() : '';
    } catch (e) {
        return errorres(res, '无法读取服务器版本号');
    }
    try {
        changelog = fs.readFileSync(require('path').join(__dirname, 'UpdateApk', 'main'), 'utf8').trim();
    } catch (e) {
        changelog = '';
    }
    const apkurl = '/UpdateApk/FenceCloudShop.apk';

    if (clientVersion && clientBuild) {
        // 只要客户端版本号或build与服务器不一致就提示更新
        if (clientVersion !== latestVersion || clientBuild !== latestBuild) {
            console.log(`客户端版本: ${clientVersion}, 服务器版本: ${latestVersion}`);
            console.log(`客户端构建: ${clientBuild}, 服务器构建: ${latestBuild}`);
            return res.send({
                update_available: true,
                update_url: apkurl,
                version: latestVersion,
                build: latestBuild,
                changelog: changelog
            });
        } else {
            return res.send({ update_available: false, version: latestVersion, build: latestBuild });
        }
    } else {
        return errorres(res, '缺少客户端版本号');
    }
}

// 数据库连接封装
async function getDbConnection() {
    const dbConfig = {
        host: process.env.Mysql_HOST,
        user: process.env.Mysql_USER,
        password: process.env.Mysql_PASSWORD,
        database: process.env.Mysql_DATABASE,
    };
    //判断链接是否成功
    if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
        throw new Error('数据库配置不完整');
    }
    return mysql.createConnection(dbConfig);
}

// 通用插入函数，支持自定义表名、字段和值
async function dbInsert(connection, table, fields, values) {
    if (!Array.isArray(fields) || !Array.isArray(values) || fields.length !== values.length) {
        throw new Error('字段和值数量不匹配');
    }
    const fieldStr = fields.map(f => `\`${f}\``).join(', ');
    const placeholder = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${table}\` (${fieldStr}) VALUES (${placeholder})`;
    return connection.execute(sql, values);
}
// 通用查询函数，支持自定义表名、字段、条件
async function dbQuery(connection, table, fields, whereClause = '', whereValues = []) {
    const fieldStr = Array.isArray(fields) ? fields.map(f => `\`${f}\``).join(', ') : '*';
    let sql = `SELECT ${fieldStr} FROM \`${table}\``;
    if (whereClause) {
        sql += ` WHERE ${whereClause}`;
    }
    return connection.execute(sql, whereValues);
}
// 用户注册事件
async function UserRegister(req, res) {
    // 1. 获取前端传递的注册信息
    if (!req.body || typeof req.body !== 'object') {
        return errorres(res, '缺少必要参数');
    }
    const { username, password, email, address = '' } = req.body;
    if (!username || !password || !email) {
        return errorres(res, '缺少必要参数');
    }

    let connection;
    try {
        // 2. 连接数据库
        connection = await getDbConnection();

        // 3. 检查用户名或邮箱是否已存在，使用通用查询函数
        const table = process.env.Mysql_USER_TABLE;
        const [rows] = await dbQuery(
            connection,
            table,
            ['id'],
            'username = ? OR email = ?',
            [username, email]
        );
        if (rows.length > 0) {
            return errorres(res, '用户名或邮箱已存在');
        }

        // 4. 插入新用户，使用通用插入函数
        await dbInsert(connection, table, ['username', 'password', 'email', 'address'], [username, password, email, address]);

        res.send({ success: true, message: '注册成功' });
    } catch (err) {
        console.error(err);
        errorres(res, '注册失败');
    } finally {
        if (connection) await connection.end();
    }
}
//用户登录事件
async function UserLogin(req, res) {
    // 1. 获取前端传递的登录信息
    if (!req.body || typeof req.body !== 'object') {
        return errorres(res, '缺少必要参数');
    }
    const { username, password } = req.body;
    if (!username || !password) {
        return errorres(res, '缺少必要参数');
    }
  

    let connection;
    try {
        // 2. 连接数据库
        connection = await getDbConnection();

        // 3. 查询用户信息，使用通用查询函数
        const table = process.env.Mysql_USER_TABLE;
        const [rows] = await dbQuery(
            connection,
            table,
            ['id', 'username', 'email', 'permission'],
            'username = ? AND password = ?',
            [username, password]
        );

        if (rows.length === 0) {
            return errorres(res, '用户名或密码错误');
        }

        const user = rows[0];
        // 生成 token，payload补充permission
        const token = jwt.sign(
            {username: user.username, email: user.email, permission: user.permission},
            JWT_SECRET,
            { expiresIn: '3d' }
        );
        // 设置cookie，兼容前端cookie方案
        res.cookie('token', token, { httpOnly: false, path: '/' });
        res.send({ success: true, user, token });
        
    } catch (err) {
        
        errorres(res, '登录失败');

        //返回详细错误
        console.error('[登录失败]', err);
    } finally {
        if (connection) await connection.end();
    }
}
// 修改密码：传入用户名、旧密码、新密码，验证后修改（jwt认证前提）
async function changeUserPassword(req, res) {
    if (!req.body || typeof req.body !== 'object') {
        return errorres(res, '缺少必要参数');
    }
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
        return errorres(res, '缺少必要参数');
    }
    if (newPassword.length < 6) {
        return errorres(res, '新密码长度不能少于6位');
    }
    let connection;
    try {
        connection = await getDbConnection();
        const table = process.env.Mysql_USER_TABLE;
        // 先校验用户名和旧密码
        const [rows] = await connection.execute(
            `SELECT id FROM \`${table}\` WHERE username = ? AND password = ?`,
            [username, oldPassword]
        );
        if (rows.length === 0) {
            return errorres(res, '用户名或旧密码错误');
        }
        // 更新密码
        await connection.execute(
            `UPDATE \`${table}\` SET password = ? WHERE username = ?`,
            [newPassword, username]
        );
        // 密码修改成功后，通知前端清除原JWT
        // 方案1：如用cookie存token，可设置Set-Cookie立即过期
        res.setHeader('Set-Cookie', 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
        // 让当前token失效（如有token）
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            if (typeof addInvalidToken === 'function') addInvalidToken(token);
        }
        // 方案2：如用localStorage，返回特殊字段让前端主动清除
        res.send({ success: true, message: '密码修改成功，请重新登录', clearToken: true });
        
    } catch (err) {
        console.error('[修改密码失败]', err);
        errorres(res, '修改密码失败');
    } finally {
        if (connection) await connection.end();
    }
}

// ===== JWT失效机制 =====
const invalidTokens = new Set();

function addInvalidToken(token) {
    invalidTokens.add(token);
}

function isTokenInvalid(token) {
    return invalidTokens.has(token);
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return errorres(res, '未提供token');
    const token = authHeader.replace('Bearer ', '');
    if (isTokenInvalid(token)) {
        return errorres(res, { success: false, message: 'token已失效，请重新登录' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // 挂载到 req，后续可用
        next();
    } catch (err) {
        return errorres(res, { success: false, message: 'token无效或已过期' });
    }
}

// 获取关于我们内容
async function getAboutUs(req, res) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'assets', 'aboutus.txt');
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.send({ success: true, content });
    } catch (err) {
        console.error('[获取关于我们失败]', err);
        res.status(500).send({ success: false, message: '获取关于我们失败', error: err.message });
    }
}

// 获取用户须知内容
async function getUserNotice(req, res) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'assets', 'usernotice.txt');
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.send({ success: true, content });
    } catch (err) {
        console.error('[获取用户须知失败]', err);
        res.status(500).send({ success: false, message: '获取用户须知失败', error: err.message });
    }
}

module.exports = {
  getUserFieldsByname,
  UserWallet,
  uploadAvatar,
  UserProfile,
  RootCheck,
  UpdateCheck,
  jsondecry,
  UserRegister: UserRegister,
  register: UserRegister,
  getDbConnection,
  dbInsert,
  dbQuery,
  UserLogin: UserLogin,
  login: UserLogin,
  authMiddleware,
  updateUserAddressOrPhone,
  changeUserPassword,
  getAboutUs,
  getUserNotice,
  UserProfile,
  getUserBalance: UserWallet,
  updateUserInfo: updateUserAddressOrPhone,
  errorres
};