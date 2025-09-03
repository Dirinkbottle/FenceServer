// 更新API调用路径，添加/api前缀
// 后备调用方式
async function callUserApi(endpoint, data = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
  
  try {
    const response = await fetch(`/api/admin/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error(`API调用失败 (${endpoint})`, error);
    return { success: false, message: '网络错误，请稍后再试' };
  }
}

// 用户管理渲染逻辑
// 依赖 window.adminApi

function getPermissionLabel(permission) {
  switch (Number(permission)) {
    case 1: return '<span class="badge bg-success">管理员</span>';
    case 3: return '<span class="badge bg-primary">商家</span>';
    case 4: return '<span class="badge bg-danger">已封禁</span>';
    case 0:
    default: return '普通用户';
  }
}

function renderUserTable(users) {
  const wrap = document.getElementById('userTableWrap');
  if (!wrap) return;
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h5 class="mb-0">用户管理</h5>
      <div>
        <button class="btn btn-danger btn-sm me-1" id="batchDeleteUserBtn">批量删除</button>
        <button class="btn btn-warning btn-sm me-1" id="batchDisableUserBtn">批量禁用</button>
        <button class="btn btn-info btn-sm me-1" id="batchEnableUserBtn">批量启用</button>
        <button class="btn btn-primary btn-sm" id="addUserBtn">新增用户</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th><input type="checkbox" id="userCheckAll"></th>
            <th>ID</th><th>用户名</th><th>邮箱</th><th>地址</th><th>电话</th><th>权限</th><th>余额</th><th>头像</th><th>头像更新时间</th><th>状态</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><input type='checkbox' class='userCheckItem' value='${u.id}'></td>
              <td>${u.id}</td>
              <td>${u.username}</td>
              <td>${u.email}</td>
              <td>${u.address || ''}</td>
              <td>${u.phone || ''}</td>
              <td>${getPermissionLabel(u.permission)}</td>
              <td>${u.balance ?? ''}</td>
              <td>${u.avatar ? `<img src="${u.avatar}" style="max-width:40px;max-height:40px;border-radius:50%">` : ''}</td>
              <td>${u.avatar_updated_at || ''}</td>
              <td>${u.status == 0 ? '<span class=\'badge bg-secondary\'>禁用</span>' : '<span class=\'badge bg-info\'>启用</span>'}</td>
              <td>
                <button class='btn btn-sm btn-outline-info me-1'>编辑</button>
                <button class='btn btn-sm btn-outline-danger me-1'>删除</button>
                <button class='btn btn-sm btn-outline-warning'>${u.status == 1 ? '禁用' : '启用'}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="userModalWrap"></div>
  `;
  wrap.innerHTML = html;
  document.getElementById('addUserBtn').onclick = showAddUserModal;
  // 批量选择
  document.getElementById('userCheckAll').onclick = function() {
    document.querySelectorAll('.userCheckItem').forEach(cb => cb.checked = this.checked);
  };
  // 批量删除
  document.getElementById('batchDeleteUserBtn').onclick = function() {
    const ids = Array.from(document.querySelectorAll('.userCheckItem:checked')).map(cb=>cb.value);
    if (!ids.length) return alert('请选择要删除的用户');
    if (!confirm('确定批量删除选中用户？')) return;
    // 批量删除用对象格式
    window.adminApi.deleteUser({ ids }).then(()=>loadUserTable());
  };
  // 批量禁用
  document.getElementById('batchDisableUserBtn').onclick = function() {
    const ids = Array.from(document.querySelectorAll('.userCheckItem:checked')).map(cb=>cb.value);
    if (!ids.length) return alert('请选择要禁用的用户');
    Promise.all(ids.map(id=>window.adminApi.setUserStatus(id,0))).then(()=>loadUserTable());
  };
  // 批量启用
  document.getElementById('batchEnableUserBtn').onclick = function() {
    const ids = Array.from(document.querySelectorAll('.userCheckItem:checked')).map(cb=>cb.value);
    if (!ids.length) return alert('请选择要启用的用户');
    Promise.all(ids.map(id=>window.adminApi.setUserStatus(id,1))).then(()=>loadUserTable());
  };
  // 移除内联事件绑定，改为JS绑定
  wrap.querySelectorAll(".btn-outline-info").forEach(btn => {
    btn.onclick = function() {
      const user_id = this.closest('tr').querySelector('.userCheckItem').value;
      adminEditUser(Number(user_id));
    };
  });
  wrap.querySelectorAll(".btn-outline-danger").forEach(btn => {
    btn.onclick = function() {
      const user_id = this.closest('tr').querySelector('.userCheckItem').value;
      adminDeleteUser(Number(user_id));
    };
  });
  wrap.querySelectorAll(".btn-outline-warning").forEach(btn => {
    btn.onclick = function() {
      const user_id = this.closest('tr').querySelector('.userCheckItem').value;
      const status = this.textContent.trim() === '禁用' ? 0 : 1;
      adminSetUserStatus(Number(user_id), status);
    };
  });
}

function showAddUserModal() {
  showUserModal({});
}
function adminEditUser(id) {
  const user = window._adminUserList.find(u => u.id === id);
  showUserModal(user || {});
}
function showUserModal(user) {
  const isEdit = !!user.id;
  const modalHtml = `
    <div class="modal fade" id="userModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isEdit ? '编辑用户' : '新增用户'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="userForm">
              ${isEdit ? `<input type="hidden" id="userId" value="${user.id}">` : ''}
              <div class="mb-2"><label>用户名</label><input type="text" class="form-control" id="username" value="${user.username || ''}" required></div>
              <div class="mb-2"><label>邮箱</label><input type="email" class="form-control" id="email" value="${user.email || ''}" required></div>
              <div class="mb-2"><label>密码${isEdit ? ' <span class=\'text-muted\'>(留空不修改)</span>' : ''}</label><input type="password" class="form-control" id="password"></div>
              <div class="mb-2"><label>地址</label><input type="text" class="form-control" id="address" value="${user.address || ''}"></div>
              <div class="mb-2"><label>电话</label><input type="text" class="form-control" id="phone" value="${user.phone || ''}"></div>
              <div class="mb-2"><label>余额</label><input type="number" class="form-control" id="balance" value="${user.balance ?? 0}" step="0.01"></div>
              <div class="mb-2"><label>头像URL</label><input type="text" class="form-control" id="avatar" value="${user.avatar || ''}" placeholder="图片URL或Base64"></div>
              <div class="mb-2"><label>头像更新时间</label><input type="datetime-local" class="form-control" id="avatar_updated_at" value="${user.avatar_updated_at ? user.avatar_updated_at.replace(' ', 'T').slice(0,16) : ''}"></div>
              <div class="mb-2"><label>权限</label><select class="form-control" id="permission">
                <option value="0" ${user.permission == 0 ? 'selected' : ''}>普通用户</option>
                <option value="1" ${user.permission == 1 ? 'selected' : ''}>管理员</option>
                <option value="3" ${user.permission == 3 ? 'selected' : ''}>商家</option>
                <option value="4" ${user.permission == 4 ? 'selected' : ''}>已封禁</option>
              </select></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" id="saveUserBtn">保存</button>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('userModalWrap').innerHTML = modalHtml;
  var modal = new bootstrap.Modal(document.getElementById('userModal'));
  modal.show();
  document.getElementById('saveUserBtn').onclick = function() {
    const id = isEdit ? document.getElementById('userId').value : undefined;
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const permission = document.getElementById('permission').value;
    const password = document.getElementById('password').value;
    const balance = parseFloat(document.getElementById('balance').value) || 0;
    const avatar = document.getElementById('avatar').value.trim();
    const avatar_updated_at = document.getElementById('avatar_updated_at').value ? document.getElementById('avatar_updated_at').value.replace('T', ' ') + ':00' : null;
    if (!username || !email || (!isEdit && !password)) {
      alert('请填写必填项');
      return;
    }
    const user = isEdit ? { id, username, email, address, phone, permission, avatar, avatar_updated_at, balance } : { username, password, email, address, phone, permission, avatar, avatar_updated_at, balance };
    (isEdit ? window.adminApi.editUser(user) : window.adminApi.addUser(user)).then(function(res) {
      if (res.success) {
        modal.hide();
        loadUserTable();
      } else {
        alert(res.message || '操作失败');
      }
    });
  };
}
function adminDeleteUser(id) {
  if (!confirm('确定要删除该用户吗？')) return;
  // 单个删除用对象格式
  window.adminApi.deleteUser({ id }).then(res => {
    if (res.success) loadUserTable();
    else alert(res.message || '删除失败');
  });
}
function adminSetUserStatus(id, status) {
  window.adminApi.setUserStatus(id, status).then(res => {
    if (res.success) loadUserTable();
    else alert(res.message || '操作失败');
  });
}
function loadUserTable() {
  window.adminApi.getAllUsers().then(data => {
    if (data.success) {
      window._adminUserList = data.users;
      renderUserTable(data.users);
    } else {
      document.getElementById('userTableWrap').innerHTML = '<div class="alert alert-danger">' + (data.message || '获取用户失败') + '</div>';
    }
  });
}
// 页面加载和切换到用户管理tab时自动刷新
if (document.getElementById('userTableWrap')) {
  loadUserTable();
  document.getElementById('user-tab').addEventListener('click', loadUserTable);
}
