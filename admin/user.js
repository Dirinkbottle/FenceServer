// user.js
// 用户管理相关API
const { getDbConnection } = require('../normalapi.js');

// 获取所有用户
async function getAllUsers(req, res) {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute('SELECT id, username, email, address, phone, permission, avatar, avatar_updated_at, balance FROM users');
    res.send({ success: true, users: rows });
  } catch (err) {
    console.error('[getAllUsers error]', err);
    res.status(500).send({ success: false, message: '查询失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 新增用户
async function addUser(req, res) {
  const { username, password, email, address = '', phone = null, permission = 0, avatar = '', avatar_updated_at = null, balance = 0 } = req.body || {};
  if (!username || !password || !email) {
    return res.status(400).send({ success: false, message: '缺少必要参数' });
  }
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (rows.length > 0) {
      return res.send({ success: false, message: '用户名或邮箱已存在' });
    }
    await connection.execute(
      'INSERT INTO users (username, password, email, address, phone, permission, avatar, avatar_updated_at, balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, password, email, address, phone, permission, avatar, avatar_updated_at, balance]
    );
    res.send({ success: true, message: '用户新增成功' });
  } catch (err) {
    console.error('[addUser error]', err);
    res.status(500).send({ success: false, message: '新增用户失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 编辑用户
async function editUser(req, res) {
  let { id, username, email, address, phone, permission, avatar, avatar_updated_at, balance, password } = req.body || {};
  if (!id || !username || !email) {
    return res.status(400).send({ success: false, message: '缺少必要参数' });
  }
  // 除密码外，其余字段留空都设置为 null
  if (username === '') username = null;
  if (email === '') email = null;
  if (address === '') address = null;
  if (phone === '') phone = null;
  if (permission === '') permission = null;
  if (avatar === '') avatar = null;
  if (avatar_updated_at === '') avatar_updated_at = null;
  if (balance === '') balance = null;

  let connection;
  try {
    connection = await getDbConnection();
    // 动态拼接SQL和参数，只更新有值的字段
    const fields = [];
    const params = [];
    if (username !== undefined) { fields.push('username=?'); params.push(username); }
    if (email !== undefined) { fields.push('email=?'); params.push(email); }
    if (address !== undefined) { fields.push('address=?'); params.push(address); }
    if (phone !== undefined) { fields.push('phone=?'); params.push(phone); }
    if (permission !== undefined) { fields.push('permission=?'); params.push(permission); }
    if (avatar !== undefined) { fields.push('avatar=?'); params.push(avatar); }
    if (avatar_updated_at !== undefined) { fields.push('avatar_updated_at=?'); params.push(avatar_updated_at); }
    if (balance !== undefined) { fields.push('balance=?'); params.push(balance); }
    // 新增：仅当密码非空时才更新密码
    if (password !== undefined && password !== null && password !== '') {
      fields.push('password=?');
      params.push(password);
    }
    if (fields.length === 0) {
      return res.status(400).send({ success: false, message: '无可更新字段' });
    }
    // 处理 phone 字段
    if (phone !== null && phone !== undefined) {
      phone = parseInt(phone, 10);
      if (isNaN(phone)) phone = null;
    }
    params.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const [result] = await connection.execute(sql, params);
    res.send({ success: true, message: '用户信息已更新' });
  } catch (err) {
    console.error('[editUser error]', err);
    res.status(500).send({ success: false, message: '编辑用户失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

// 删除用户
async function deleteUser(req, res) {
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).send({ success: false, message: '缺少用户ID' });
  }
  let connection;
  try {
    connection = await getDbConnection();
    await connection.execute('DELETE FROM users WHERE id = ?', [id]);
    res.send({ success: true, message: '用户已删除' });
  } catch (err) {
    console.error('[deleteUser error]', err);
    res.status(500).send({ success: false, message: '删除用户失败', error: err.message });
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = {
  getAllUsers,
  addUser,
  editUser,
  deleteUser,
};
