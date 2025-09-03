// 通知管理渲染与交互逻辑
let notificationData = {
  notifications: []
};

// 统一加载通知数据的函数
async function loadNotifications() {
  const wrap = document.getElementById('notificationTableWrap');
  if (!wrap) return;
  
  wrap.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2">加载中...</p></div>';
  
  try {
    // 使用全局API函数
    const res = await window.adminApi?.getAllNotifications?.() || 
                await fetch('/api/admin/getAllNotifications', { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  } 
                }).then(r=>r.json());
    
    if (!res.success) throw new Error(res.message || '获取失败');
    notificationData.notifications = res.notifications || [];
    renderNotificationTable(notificationData.notifications);
  } catch (e) {
    wrap.innerHTML = `<div class="alert alert-danger">${e.message || '加载通知数据失败'}</div>`;
    console.error('加载通知失败', e);
  }
}

// 通知类型映射
const NOTIFICATION_TYPE_MAP = {
  'system': { label: '系统通知', color: 'primary', icon: 'info-circle' },
  'order': { label: '订单通知', color: 'success', icon: 'cart-check' },
  'promotion': { label: '促销活动', color: 'warning', icon: 'megaphone' },
  'update': { label: '更新通知', color: 'info', icon: 'arrow-clockwise' },
  'alert': { label: '警告通知', color: 'danger', icon: 'exclamation-triangle' },
  'other': { label: '其他通知', color: 'secondary', icon: 'chat-dots' }
};

// 渲染通知表格
function renderNotificationTable(notifications) {
  const wrap = document.getElementById('notificationTableWrap');
  if (!wrap) return;
  
  if (!notifications || notifications.length === 0) {
    wrap.innerHTML = '<div class="alert alert-info">暂无通知数据</div>';
    return;
  }
  
  let html = `
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th width="50"><input type="checkbox" id="notificationCheckAll"></th>
            <th>ID</th>
            <th>类型</th>
            <th>标题</th>
            <th>内容</th>
            <th>状态</th>
            <th>发送时间</th>
            <th>过期时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  notifications.forEach(notification => {
    const typeInfo = NOTIFICATION_TYPE_MAP[notification.type] || NOTIFICATION_TYPE_MAP.other;
    const isActive = notification.status === 'active' || notification.status === 1;
    const isExpired = notification.expire_time && new Date(notification.expire_time) < new Date();
    let statusClass = isActive ? 'success' : 'secondary';
    if (isExpired && isActive) statusClass = 'warning';
    
    html += `
      <tr data-id="${notification.id}">
        <td><input type="checkbox" class="notificationCheckItem" value="${notification.id}"></td>
        <td>${notification.id}</td>
        <td>
          <span class="badge bg-${typeInfo.color}">
            <i class="bi bi-${typeInfo.icon}"></i> ${typeInfo.label}
          </span>
        </td>
        <td>${notification.title}</td>
        <td>${notification.content?.length > 50 ? notification.content.substring(0, 50) + '...' : notification.content || '-'}</td>
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input notification-status-toggle" type="checkbox" role="switch" ${isActive ? 'checked' : ''}>
            <label class="form-check-label text-${statusClass}">
              ${isActive ? (isExpired ? '已过期' : '活跃') : '停用'}
            </label>
          </div>
        </td>
        <td>${notification.created_at || '-'}</td>
        <td>${notification.expire_time || '永久'}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary edit-notification-btn">编辑</button>
            <button class="btn btn-outline-info view-notification-btn">查看</button>
            <button class="btn btn-outline-danger delete-notification-btn">删除</button>
          </div>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    <div class="mt-2">
      <button class="btn btn-danger btn-sm" id="batchDeleteNotificationBtn">批量删除</button>
      <button class="btn btn-success btn-sm" id="batchActivateNotificationBtn">批量启用</button>
      <button class="btn btn-secondary btn-sm" id="batchDeactivateNotificationBtn">批量停用</button>
    </div>
  `;
  
  wrap.innerHTML = html;
  
  // 全选/取消全选
  document.getElementById('notificationCheckAll')?.addEventListener('change', function() {
    document.querySelectorAll('.notificationCheckItem').forEach(item => {
      item.checked = this.checked;
    });
  });
  
  // 批量删除
  document.getElementById('batchDeleteNotificationBtn')?.addEventListener('click', function() {
    const selectedIds = Array.from(document.querySelectorAll('.notificationCheckItem:checked')).map(item => item.value);
    if (selectedIds.length === 0) {
      alert('请先选择要删除的通知');
      return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedIds.length} 个通知吗？`)) {
      deleteNotifications(selectedIds);
    }
  });
  
  // 批量启用
  document.getElementById('batchActivateNotificationBtn')?.addEventListener('click', function() {
    const selectedIds = Array.from(document.querySelectorAll('.notificationCheckItem:checked')).map(item => item.value);
    if (selectedIds.length === 0) {
      alert('请先选择要启用的通知');
      return;
    }
    
    updateNotificationsStatus(selectedIds, true);
  });
  
  // 批量停用
  document.getElementById('batchDeactivateNotificationBtn')?.addEventListener('click', function() {
    const selectedIds = Array.from(document.querySelectorAll('.notificationCheckItem:checked')).map(item => item.value);
    if (selectedIds.length === 0) {
      alert('请先选择要停用的通知');
      return;
    }
    
    updateNotificationsStatus(selectedIds, false);
  });
  
  // 状态开关
  document.querySelectorAll('.notification-status-toggle').forEach(toggle => {
    toggle.addEventListener('change', function() {
      const id = this.closest('tr').dataset.id;
      const isActive = this.checked;
      
      updateNotificationsStatus([id], isActive);
    });
  });
  
  // 编辑按钮
  document.querySelectorAll('.edit-notification-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.closest('tr').dataset.id;
      const notification = notificationData.notifications.find(n => n.id == id);
      if (notification) {
        showNotificationModal(notification);
      }
    });
  });
  
  // 查看按钮
  document.querySelectorAll('.view-notification-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.closest('tr').dataset.id;
      const notification = notificationData.notifications.find(n => n.id == id);
      if (notification) {
        showNotificationDetailModal(notification);
      }
    });
  });
  
  // 删除按钮
  document.querySelectorAll('.delete-notification-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.closest('tr').dataset.id;
      if (confirm('确定要删除此通知吗？')) {
        deleteNotifications([id]);
      }
    });
  });
}

// 显示通知详情模态框
function showNotificationDetailModal(notification) {
  const typeInfo = NOTIFICATION_TYPE_MAP[notification.type] || NOTIFICATION_TYPE_MAP.other;
  
  let modalHtml = `
    <div class="modal fade" id="notificationDetailModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-${typeInfo.color} text-white">
            <h5 class="modal-title">
              <i class="bi bi-${typeInfo.icon}"></i> ${notification.title}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <span class="badge bg-${typeInfo.color}">${typeInfo.label}</span>
              <small class="text-muted ms-2">ID: ${notification.id}</small>
            </div>
            <div class="card mb-3">
              <div class="card-body">
                ${notification.content || '无内容'}
              </div>
            </div>
            <div class="d-flex justify-content-between">
              <small class="text-muted">发送时间: ${notification.created_at || '-'}</small>
              <small class="text-muted">过期时间: ${notification.expire_time || '永久'}</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 移除已存在的模态框
  const existingModal = document.getElementById('notificationDetailModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 添加模态框到DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // 显示模态框
  const modal = new bootstrap.Modal(document.getElementById('notificationDetailModal'));
  modal.show();
}

// 显示通知编辑/新增模态框
function showNotificationModal(notification = {}) {
  const isEdit = !!notification.id;
  
  // 创建模态框HTML
  let modalHtml = `
    <div class="modal fade" id="notificationModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isEdit ? '编辑' : '发布'}通知</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="notificationForm">
              ${isEdit ? `<input type="hidden" id="notificationId" value="${notification.id}">` : ''}
              
              <div class="mb-3">
                <label class="form-label">通知类型</label>
                <select class="form-select" id="notificationType" required>
                  ${Object.entries(NOTIFICATION_TYPE_MAP).map(([key, info]) => 
                    `<option value="${key}" ${notification.type === key ? 'selected' : ''}>${info.label}</option>`
                  ).join('')}
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">通知标题</label>
                <input type="text" class="form-control" id="notificationTitle" value="${notification.title || ''}" required>
              </div>
              
              <div class="mb-3">
                <label class="form-label">通知内容</label>
                <textarea class="form-control" id="notificationContent" rows="4" required>${notification.content || ''}</textarea>
              </div>
              
              <div class="mb-3">
                <label class="form-label">过期时间</label>
                <input type="datetime-local" class="form-control" id="notificationExpireTime" value="${notification.expire_time ? notification.expire_time.replace(' ', 'T') : ''}">
                <small class="form-text text-muted">留空表示永不过期</small>
              </div>
              
              <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="notificationStatus" ${notification.status === 'active' || notification.status === 1 ? 'checked' : ''}>
                <label class="form-check-label" for="notificationStatus">立即启用</label>
              </div>
              
              <div class="mb-3 form-check">
                <input type="checkbox" class="form-check-input" id="notificationSendToAll" checked>
                <label class="form-check-label" for="notificationSendToAll">发送给所有用户</label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" id="saveNotificationBtn">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 移除已存在的模态框
  const existingModal = document.getElementById('notificationModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 添加模态框到DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // 显示模态框
  const modal = new bootstrap.Modal(document.getElementById('notificationModal'));
  modal.show();
  
  // 保存按钮事件
  document.getElementById('saveNotificationBtn').addEventListener('click', function() {
    const form = document.getElementById('notificationForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const notificationData = {
      type: document.getElementById('notificationType').value,
      title: document.getElementById('notificationTitle').value.trim(),
      content: document.getElementById('notificationContent').value.trim(),
      expire_time: document.getElementById('notificationExpireTime').value ? document.getElementById('notificationExpireTime').value.replace('T', ' ') : null,
      status: document.getElementById('notificationStatus').checked ? 'active' : 'inactive',
      send_to_all: document.getElementById('notificationSendToAll').checked
    };
    
    if (isEdit) {
      notificationData.id = document.getElementById('notificationId').value;
    }
    
    saveNotification(notificationData, modal);
  });
}

// 保存通知数据
async function saveNotification(data, modal) {
  try {
    const isEdit = !!data.id;
    const action = isEdit ? 'editNotification' : 'addNotification';
    
    // 使用全局API函数或直接发送请求
    const res = await window.adminApi?.[action]?.(data) || 
                await fetch(`/api/admin/${action}`, { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  },
                  body: JSON.stringify(data)
                }).then(r=>r.json());
    
    if (!res.success) throw new Error(res.message || '保存失败');
    
    modal.hide();
    alert(isEdit ? '通知已更新' : '通知已发布');
    loadNotifications(); // 重新加载数据
  } catch (e) {
    alert('保存失败: ' + e.message);
    console.error('保存通知失败', e);
  }
}

// 更新通知状态
async function updateNotificationsStatus(ids, isActive) {
  try {
    // 使用全局API函数或直接发送请求
    const res = await window.adminApi?.updateNotificationStatus?.({ ids, status: isActive ? 'active' : 'inactive' }) || 
                await fetch('/api/admin/updateNotificationStatus', { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  },
                  body: JSON.stringify({ ids, status: isActive ? 'active' : 'inactive' })
                }).then(r=>r.json());
    
    if (!res.success) throw new Error(res.message || '更新状态失败');
    
    alert('通知状态已更新');
    loadNotifications(); // 重新加载数据
  } catch (e) {
    alert('更新状态失败: ' + e.message);
    console.error('更新通知状态失败', e);
  }
}

// 删除通知
async function deleteNotifications(ids) {
  try {
    // 使用全局API函数或直接发送请求
    const res = await window.adminApi?.deleteNotification?.({ ids }) || 
                await fetch('/api/admin/deleteNotification', { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  },
                  body: JSON.stringify({ ids })
                }).then(r=>r.json());
    
    if (!res.success) throw new Error(res.message || '删除失败');
    
    alert('通知已删除');
    loadNotifications(); // 重新加载数据
  } catch (e) {
    alert('删除失败: ' + e.message);
    console.error('删除通知失败', e);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 添加按钮事件
  document.getElementById('addNotificationBtn')?.addEventListener('click', function() {
    showNotificationModal();
  });
  
  // 刷新按钮事件
  document.getElementById('refreshNotificationsBtn')?.addEventListener('click', loadNotifications);
  
  // Tab切换时加载数据
  document.getElementById('notification-tab')?.addEventListener('click', loadNotifications);
  
  // 如果已在该Tab，自动加载
  if (document.getElementById('notification')?.classList.contains('show')) {
    loadNotifications();
  }
});

// 全局导出
window.loadNotifications = loadNotifications;
window.showNotificationModal = showNotificationModal; 