// 生成10位随机订单号
function generateOrderId() {
    return Math.random().toString().slice(2, 12);
}

const { getDbConnection, getUserFieldsByname } = require('./normalapi.js');

module.exports = {
    getDbConnection,
    getUserFieldsByname,
    generateOrderId,
};
