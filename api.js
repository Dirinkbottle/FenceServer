const { getDbConnection } = require('./normalapi');
require('dotenv').config();

// 获取 AdminControl 表所有内容
async function getApi(req, res) {
    let connection;
    try {
        connection = await getDbConnection();
        const table = process.env.MYSQL_ADMINCONTROL_TABLE;
        const [rows] = await connection.execute(`SELECT * FROM \`${table}\``);
        res.send({ success: true, data: rows });
    } catch (err) {
        if (connection) await connection.end();
        console.error('[获取AdminControl失败]', err);
        res.status(500).send({ success: false, message: '获取AdminControl失败', error: err.message });
    } finally {
        if (connection) await connection.end();
    }
}


module.exports = { getApi};