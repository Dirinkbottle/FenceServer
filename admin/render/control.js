// 参数配置渲染与交互逻辑

// 使用window命名空间或检查是否已定义，避免重复声明
if (typeof window.CONFIG_TYPE_MAP === 'undefined') {
  window.CONFIG_TYPE_MAP = {
    map_api: {
      label: '地图API',
      options: [
        { value: 'google', label: '谷歌地图' },
        { value: 'baidu', label: '百度地图' }
      ]
    },
    alipay_mode: {
      label: '支付宝模式',
      options: [
        { value: 0, label: '正式' },
        { value: 1, label: '沙箱' },
        { value: 2, label: '关闭' }
      ]
    },
    wechat_pay: {
      label: '微信钱包',
      options: [
        { value: 1, label: '开启' },
        { value: 0, label: '关闭' }
      ]
    }
  };
}

// 使用window.CONFIG_TYPE_MAP代替直接使用CONFIG_TYPE_MAP

// 统一配置加载函数名为 loadConfigs
async function loadConfigs() {
  const wrap = document.getElementById('configTableContainer') || document.getElementById('configTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="text-muted">加载中...</div>';
  try {
    // 使用全局API函数
    const res = await window.adminApi?.getAllConfigs?.() || 
                await window.getAllConfigs?.() || 
                await fetch('/api/admin/getAllConfigs', { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  } 
                }).then(r=>r.json());
                
    if (!res.success) throw new Error(res.message || '获取失败');
    const configs = res.configs || [];
    wrap.innerHTML = renderConfigTable(configs);
    bindConfigTableEvents(configs);
  } catch (e) {
    wrap.innerHTML = `<div class="text-danger">加载失败：${e.message}</div>`;
  }
}

function renderConfigTable(configs) {
  return `
    <div class="d-flex justify-content-between mb-3">
      <h5>系统配置项</h5>
      <button class="btn btn-primary btn-sm" onclick="showAddConfigModal()">添加配置</button>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle small">
        <thead class="table-light">
          <tr>
            <th>ID</th>
            <th>键名</th>
            <th>配置项名</th>
            <th>配置值</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${configs.map(cfg => `
            <tr data-id="${cfg.id}">
              <td>${cfg.id}</td>
              <td>${cfg.keyname}</td>
              <td>${window.CONFIG_TYPE_MAP[cfg.keyname]?.label || cfg.configname || ''}</td>
              <td>${renderConfigValue(cfg)}</td>
              <td>${cfg.updated_at || ''}</td>
              <td>
                <button class="btn btn-sm btn-primary me-1 edit-config">编辑</button>
                <button class="btn btn-sm btn-secondary me-1 copy-config">复制</button>
                <button class="btn btn-sm btn-danger delete-config">删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

function renderConfigValue(cfg) {
  const map = window.CONFIG_TYPE_MAP[cfg.keyname];
  if (map) {
    const opt = map.options.find(o => String(o.value) === String(cfg.value));
    return opt ? opt.label : cfg.value;
  }
  return cfg.value;
}

function bindConfigTableEvents(configs) {
  document.querySelectorAll('.edit-config').forEach(btn => {
    btn.onclick = function() {
      const id = this.closest('tr').dataset.id;
      const cfg = configs.find(c => String(c.id) === String(id));
      showConfigEditModal(cfg);
    };
  });
  document.querySelectorAll('.copy-config').forEach(btn => {
    btn.onclick = function() {
      const id = this.closest('tr').dataset.id;
      const cfg = configs.find(c => String(c.id) === String(id));
      showConfigEditModal({ ...cfg, id: undefined });
    };
  });
  document.querySelectorAll('.delete-config').forEach(btn => {
    btn.onclick = async function() {
      if (!confirm('确定要删除该配置项吗？')) return;
      const id = this.closest('tr').dataset.id;
      try {
        // 使用全局API函数
        const res = await window.adminApi?.deleteConfig?.({ id }) || 
                    await window.deleteConfig?.({ id }) || 
                    await fetch('/api/admin/deleteConfig', { 
                      method: 'POST', 
                      headers: { 
                        'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                        'Content-Type': 'application/json' 
                      }, 
                      body: JSON.stringify({ id }) 
                    }).then(r=>r.json());
                    
        if (!res.success) throw new Error(res.message || '删除失败');
        loadConfigs();
      } catch (e) {
        alert('删除失败：' + e.message);
      }
    };
  });
}

function showAddConfigModal() {
  showConfigEditModal();
}

function showConfigEditModal(cfg = {}) {
  let modal = document.getElementById('configEditModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.innerHTML = `
      <div class="modal fade" id="configEditModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${cfg.id ? '编辑' : '新增'}配置项</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="configEditForm">
                <div class="mb-2">
                  <label class="form-label">键名</label>
                  <select class="form-select" name="keyname" required ${cfg.id ? 'disabled' : ''}>
                    <option value="">请选择</option>
                    ${Object.entries(window.CONFIG_TYPE_MAP).map(([k,v]) => `<option value="${k}" ${cfg.keyname===k?'selected':''}>${v.label}</option>`).join('')}
                  </select>
                </div>
                <div class="mb-2">
                  <label class="form-label">配置值</label>
                  <div id="configValueInputWrap"></div>
                </div>
                <div class="mb-2">
                  <label class="form-label">配置项名</label>
                  <input class="form-control" name="configname" value="${cfg.configname||''}" placeholder="可选" />
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
              <button type="button" class="btn btn-primary" id="saveConfigBtn">保存</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  // 填充表单
  const form = modal.querySelector('#configEditForm');
  form.keyname.value = cfg.keyname || '';
  renderConfigValueInput(cfg.keyname, cfg.value);
  form.keyname.onchange = function() {
    renderConfigValueInput(this.value, '');
  };
  function renderConfigValueInput(keyname, value) {
    const wrap = form.querySelector('#configValueInputWrap');
    const map = window.CONFIG_TYPE_MAP[keyname];
    if (map) {
      wrap.innerHTML = `<select class="form-select" name="value" required>${map.options.map(o => `<option value="${o.value}" ${String(o.value)===String(value)?'selected':''}>${o.label}</option>`).join('')}</select>`;
    } else {
      wrap.innerHTML = `<input class="form-control" name="value" value="${value||''}" required />`;
    }
  }
  // 保存
  modal.querySelector('#saveConfigBtn').onclick = async function() {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if (cfg.id) data.id = cfg.id;
    try {
      // 使用全局API函数
      const res = await window.adminApi?.editConfig?.(data) || 
                  await window.editConfig?.(data) || 
                  await fetch('/api/admin/editConfig', { 
                    method: 'POST', 
                    headers: { 
                      'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                      'Content-Type': 'application/json' 
                    }, 
                    body: JSON.stringify(data) 
                  }).then(r=>r.json());
                  
      if (!res.success) throw new Error(res.message || '保存失败');
      bootstrap.Modal.getOrCreateInstance(modal.querySelector('.modal')).hide();
      loadConfigs();
    } catch (e) {
      alert('保存失败：' + e.message);
    }
  };
  // 显示
  bootstrap.Modal.getOrCreateInstance(modal.querySelector('.modal')).show();
}

function saveConfig() {
  // 配置保存功能通过 showConfigEditModal 中的逻辑实现
  if (document.getElementById('configEditModal')) {
    document.getElementById('saveConfigBtn')?.click();
  } else {
    showAddConfigModal();
  }
}

function deleteConfig(id) {
  if (!id) return;
  if (!confirm('确定要删除该配置项吗？')) return;
  
  (async () => {
    try {
      // 使用全局API函数
      const res = await window.adminApi?.deleteConfig?.({ id }) || 
                  await window.deleteConfig?.({ id }) || 
                  await fetch('/api/admin/deleteConfig', { 
                    method: 'POST', 
                    headers: { 
                      'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                      'Content-Type': 'application/json' 
                    }, 
                    body: JSON.stringify({ id }) 
                  }).then(r=>r.json());
                  
      if (!res.success) throw new Error(res.message || '删除失败');
      loadConfigs();
    } catch (e) {
      alert('删除失败：' + e.message);
    }
  })();
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 新增、刷新按钮绑定
  if (document.getElementById('addConfigBtn')) {
    document.getElementById('addConfigBtn').onclick = () => showAddConfigModal();
  }
  if (document.getElementById('refreshConfigBtn')) {
    document.getElementById('refreshConfigBtn').onclick = () => loadConfigs();
  }
  
  // Tab切换时自动加载
  const configTab = document.getElementById('control-tab');
  if (configTab) {
    configTab.addEventListener('click', loadConfigs);
  }
  
  // 页面首次加载时自动加载（如果已在该Tab）
  if (document.getElementById('control')?.classList.contains('show')) {
    loadConfigs();
  }
  
  // 如果configTableContainer存在但为空，则初始化
  const configContainer = document.getElementById('configTableContainer');
  if (configContainer && configContainer.children.length === 0) {
    configContainer.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">加载中...</span>
        </div>
        <p class="mt-2">正在加载配置数据...</p>
      </div>
    `;
    
    // 延迟加载数据
    setTimeout(() => loadConfigs(), 500);
  }
});

// 向旧版函数兼容
function loadConfigTable() {
  loadConfigs();
}

function initConfigPanel() {
  loadConfigs();
}

// 将函数挂载到全局
window.loadConfigs = loadConfigs;
window.loadConfigTable = loadConfigTable;
window.showAddConfigModal = showAddConfigModal;
window.showEditConfigModal = showConfigEditModal;
window.saveConfig = saveConfig;
window.deleteConfig = deleteConfig;
window.initConfigPanel = initConfigPanel;
