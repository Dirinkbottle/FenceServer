// 系统日志管理脚本
let logsData = [];
let currentPage = 1;
let pageSize = 20;
let totalPages = 1;
let currentFilter = 'all';
let searchKeyword = '';

// 加载系统日志
async function loadSystemLogs(page = 1, type = 'all', search = '') {
  try {
    // 显示加载状态
    document.getElementById('logsTableWrap').innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
        <p class="mt-2">正在加载系统日志...</p>
      </div>
    `;
    
    // 更新当前页和过滤条件
    currentPage = page;
    currentFilter = type;
    searchKeyword = search;
    
    // 调用API获取日志数据
    const response = await fetch('/api/admin/getSystemLogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        page,
        limit: pageSize,
        type,
        search
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      logsData = result.logs;
      totalPages = result.pagination.pages;
      
      // 渲染日志表格
      renderLogsTable(logsData);
      
      // 渲染分页控件
      renderPagination(currentPage, totalPages);
    } else {
      throw new Error(result.message || '获取日志失败');
    }
  } catch (error) {
    console.error('加载系统日志失败:', error);
    document.getElementById('logsTableWrap').innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>加载日志失败: ${error.message}
        <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadSystemLogs()">重试</button>
      </div>
    `;
  }
}

// 渲染日志表格
function renderLogsTable(logs) {
  if (!logs || logs.length === 0) {
    document.getElementById('logsTableWrap').innerHTML = `
      <div class="alert alert-info" role="alert">
        <i class="bi bi-info-circle me-2"></i>暂无日志记录
      </div>
    `;
    return;
  }
  
  // 生成表格HTML
  const tableHTML = `
    <div class="table-responsive">
      <table class="table table-sm table-hover table-striped">
        <thead class="table-light">
          <tr>
            <th width="40px">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="selectAllLogs" onchange="toggleSelectAllLogs(this.checked)">
              </div>
            </th>
            <th width="180px">时间</th>
            <th width="80px">类型</th>
            <th>消息</th>
            <th width="100px">操作</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr data-log-id="${log.id}" class="${getLogRowClass(log.type)}">
              <td>
                <div class="form-check">
                  <input class="form-check-input log-checkbox" type="checkbox" value="${log.id}">
                </div>
              </td>
              <td>${formatTimestamp(log.timestamp)}</td>
              <td>${renderLogTypeBadge(log.type)}</td>
              <td class="text-truncate" style="max-width: 500px;" title="${log.message}">${log.message}</td>
              <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="viewLogDetails(${log.id})">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteLog(${log.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="pagination" class="d-flex justify-content-between align-items-center mt-3">
      <div>
        <button class="btn btn-sm btn-danger" onclick="deleteSelectedLogs()" id="deleteSelectedBtn" disabled>
          <i class="bi bi-trash"></i> 删除所选
        </button>
      </div>
      <div id="paginationControls"></div>
    </div>
  `;
  
  document.getElementById('logsTableWrap').innerHTML = tableHTML;
  
  // 添加日志选择事件
  document.querySelectorAll('.log-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateDeleteButtonState);
  });
}

// 渲染分页控件
function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) {
    document.getElementById('paginationControls').innerHTML = '';
    return;
  }
  
  let paginationHTML = `
    <nav aria-label="日志分页">
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="javascript:void(0)" onclick="loadSystemLogs(1, currentFilter, searchKeyword)">首页</a>
        </li>
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link" href="javascript:void(0)" onclick="loadSystemLogs(${currentPage - 1}, currentFilter, searchKeyword)">上一页</a>
        </li>
  `;
  
  // 生成页码
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="javascript:void(0)" onclick="loadSystemLogs(${i}, currentFilter, searchKeyword)">${i}</a>
      </li>
    `;
  }
  
  paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="javascript:void(0)" onclick="loadSystemLogs(${currentPage + 1}, currentFilter, searchKeyword)">下一页</a>
        </li>
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link" href="javascript:void(0)" onclick="loadSystemLogs(${totalPages}, currentFilter, searchKeyword)">末页</a>
        </li>
      </ul>
    </nav>
  `;
  
  document.getElementById('paginationControls').innerHTML = paginationHTML;
}

// 获取日志行的样式类
function getLogRowClass(type) {
  switch (type) {
    case 'error': return 'table-danger';
    case 'warn': return 'table-warning';
    case 'info': return '';
    case 'debug': return 'table-light text-muted';
    default: return '';
  }
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// 渲染日志类型徽章
function renderLogTypeBadge(type) {
  let badgeClass = 'bg-secondary';
  let icon = 'bi-info-circle';
  
  switch (type) {
    case 'error':
      badgeClass = 'bg-danger';
      icon = 'bi-exclamation-triangle';
      break;
    case 'warn':
      badgeClass = 'bg-warning text-dark';
      icon = 'bi-exclamation-circle';
      break;
    case 'info':
      badgeClass = 'bg-info text-dark';
      icon = 'bi-info-circle';
      break;
    case 'debug':
      badgeClass = 'bg-secondary';
      icon = 'bi-code-slash';
      break;
  }
  
  return `<span class="badge ${badgeClass}"><i class="bi ${icon} me-1"></i>${type}</span>`;
}

// 查看日志详情
function viewLogDetails(logId) {
  const log = logsData.find(l => l.id === logId);
  if (!log) return;
  
  // 创建模态框
  const modalId = 'logDetailModal';
  let modal = document.getElementById(modalId);
  
  if (!modal) {
    const modalHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="${modalId}Label">日志详情</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById(modalId);
  }
  
  // 填充模态框内容
  const modalBody = modal.querySelector('.modal-body');
  modalBody.innerHTML = `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>${renderLogTypeBadge(log.type)}</div>
        <small class="text-muted">${formatTimestamp(log.timestamp)}</small>
      </div>
      <h5 class="fw-bold">${log.message}</h5>
    </div>
    <div class="mb-3">
      <label class="fw-bold mb-2">详细信息:</label>
      <pre class="bg-light p-3 rounded" style="max-height: 300px; overflow-y: auto;">${log.details || '无详细信息'}</pre>
    </div>
    <div class="mb-3">
      <label class="fw-bold mb-2">IP地址:</label>
      <div>${log.ip || '未知'}</div>
    </div>
  `;
  
  // 显示模态框
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

// 删除单条日志
async function deleteLog(logId) {
  if (!confirm('确定要删除这条日志记录吗？此操作无法撤销。')) {
    return;
  }
  
  try {
    const response = await fetch('/api/admin/deleteSystemLogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        ids: [logId]
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 删除成功，重新加载日志列表
      alert('日志删除成功');
      loadSystemLogs(currentPage, currentFilter, searchKeyword);
    } else {
      throw new Error(result.message || '删除失败');
    }
  } catch (error) {
    console.error('删除日志失败:', error);
    alert('删除日志失败: ' + error.message);
  }
}

// 删除选中的日志
async function deleteSelectedLogs() {
  const selectedIds = [];
  document.querySelectorAll('.log-checkbox:checked').forEach(checkbox => {
    selectedIds.push(parseInt(checkbox.value));
  });
  
  if (selectedIds.length === 0) {
    alert('请至少选择一条日志记录');
    return;
  }
  
  if (!confirm(`确定要删除选中的 ${selectedIds.length} 条日志记录吗？此操作无法撤销。`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/admin/deleteSystemLogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        ids: selectedIds
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 删除成功，重新加载日志列表
      alert(`成功删除 ${result.affectedRows} 条日志记录`);
      loadSystemLogs(currentPage, currentFilter, searchKeyword);
    } else {
      throw new Error(result.message || '删除失败');
    }
  } catch (error) {
    console.error('删除日志失败:', error);
    alert('删除日志失败: ' + error.message);
  }
}

// 清空日志
async function clearAllLogs() {
  if (!confirm('确定要清空所有日志记录吗？此操作无法撤销。')) {
    return;
  }
  
  try {
    const response = await fetch('/api/admin/clearSystemLogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify({
        type: currentFilter
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 清空成功，重新加载日志列表
      alert(result.message);
      loadSystemLogs(1, currentFilter, searchKeyword);
    } else {
      throw new Error(result.message || '清空失败');
    }
  } catch (error) {
    console.error('清空日志失败:', error);
    alert('清空日志失败: ' + error.message);
  }
}

// 切换全选
function toggleSelectAllLogs(checked) {
  document.querySelectorAll('.log-checkbox').forEach(checkbox => {
    checkbox.checked = checked;
  });
  
  updateDeleteButtonState();
}

// 更新删除按钮状态
function updateDeleteButtonState() {
  const hasSelected = document.querySelector('.log-checkbox:checked') !== null;
  document.getElementById('deleteSelectedBtn').disabled = !hasSelected;
}

// 初始化日志管理
function initLogManager() {
  // 加载日志数据
  loadSystemLogs();
  
  // 绑定类型过滤器事件
  document.getElementById('logTypeFilter').addEventListener('change', function() {
    loadSystemLogs(1, this.value, searchKeyword);
  });
  
  // 绑定刷新按钮事件
  document.getElementById('refreshLogsBtn').addEventListener('click', function() {
    loadSystemLogs(currentPage, currentFilter, searchKeyword);
  });
  
  // 绑定清除日志按钮事件
  document.getElementById('clearLogsBtn').addEventListener('click', clearAllLogs);
}

// 初始化搜索功能
function initLogSearch() {
  // 在页面中添加搜索框
  const filterContainer = document.querySelector('.d-flex.flex-wrap.gap-2.mb-3');
  if (filterContainer) {
    const searchHTML = `
      <div class="input-group input-group-sm" style="max-width: 300px;">
        <input type="text" class="form-control" id="logSearchInput" placeholder="搜索日志...">
        <button class="btn btn-outline-secondary" type="button" id="logSearchBtn">
          <i class="bi bi-search"></i>
        </button>
      </div>
    `;
    
    filterContainer.insertAdjacentHTML('afterbegin', searchHTML);
    
    // 绑定搜索事件
    document.getElementById('logSearchBtn').addEventListener('click', function() {
      const keyword = document.getElementById('logSearchInput').value.trim();
      searchKeyword = keyword;
      loadSystemLogs(1, currentFilter, keyword);
    });
    
    // 绑定回车键搜索
    document.getElementById('logSearchInput').addEventListener('keyup', function(event) {
      if (event.key === 'Enter') {
        const keyword = this.value.trim();
        searchKeyword = keyword;
        loadSystemLogs(1, currentFilter, keyword);
      }
    });
  }
}

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 检查是否在日志页面
  if (document.getElementById('logs')) {
    initLogManager();
    initLogSearch();
    
    // 绑定Tab切换事件，在切换到日志页面时重新加载
    document.getElementById('logs-tab')?.addEventListener('click', function() {
      loadSystemLogs(1, 'all', '');
    });
  }
});

// 全局导出
window.loadSystemLogs = loadSystemLogs;
window.viewLogDetails = viewLogDetails;
window.deleteLog = deleteLog;
window.deleteSelectedLogs = deleteSelectedLogs;
window.clearAllLogs = clearAllLogs;
window.toggleSelectAllLogs = toggleSelectAllLogs; 