// control.js
// 配置管理前端功能
let controlData = {
  configs: []
};

async function safeFetchJson(url, options = {}) {
  // 自动补全API路径前缀
  if (url.startsWith('/admin/') && !url.startsWith('/admin/cdn/')) {
    url = '/api' + url;
  }
  
  // 自动补全token
  const token = window.getToken?.() || localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  // 保证Content-Type
  if (!options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }
  
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    // 先尝试解析为JSON
    let json;
    try {
      json = JSON.parse(text);
      if (json && json.needLogin) {
        alert('登录已失效或无权限，请重新登录');
        window.location.href = '/admin/login.html';
        throw new Error('未登录或无权限');
      }
      return json;
    } catch (e) {
      // 不是JSON时，兼容原有HTML判断
      if ((text.startsWith('<!DOCTYPE') || text.startsWith('<html')) &&
          (/登录|login|<form|<title>登录/i.test(text))) {
        alert('登录已失效，请重新登录');
        window.location.href = '/admin/login.html';
        throw new Error('未登录或无权限');
      }
      console.error('[safeFetchJson] 接口返回内容不是合法JSON:', text);
      throw new Error('接口返回格式错误');
    }
  } catch (error) {
    console.error('[safeFetchJson] 请求失败:', error);
    throw error;
  }
}

async function loadConfigs() {
  try {
    const result = await safeFetchJson('/admin/getAllConfigs', { method: 'POST' });
    if (result && result.success && result.configs) {
      controlData.configs = result.configs;
      renderConfigTable();
    }
  } catch (error) {
    console.error('加载配置失败', error);
    showMessage('加载配置失败：' + error.message, 'error');
  }
}

function renderConfigTable() {
  const tableContainer = document.getElementById('configTableContainer');
  if (!tableContainer) return;

  let html = `
    <div class="d-flex justify-content-between mb-3">
      <h4>系统配置</h4>
      <button class="btn btn-primary" onclick="showAddConfigModal()">添加配置</button>
    </div>
    <div class="table-responsive">
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>键名</th>
            <th>配置名称</th>
            <th>配置值</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>`;

  if (controlData.configs.length === 0) {
    html += `<tr><td colspan="6" class="text-center">暂无配置数据</td></tr>`;
  } else {
    controlData.configs.forEach(config => {
      html += `
        <tr>
          <td>${config.id}</td>
          <td>${config.keyname}</td>
          <td>${config.configname}</td>
          <td>${config.value}</td>
          <td>${config.updated_at ? new Date(config.updated_at).toLocaleString() : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="showEditConfigModal(${config.id})">编辑</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteConfig(${config.id})">删除</button>
          </td>
        </tr>`;
    });
  }

  html += `
        </tbody>
      </table>
    </div>`;

  tableContainer.innerHTML = html;
}

function showAddConfigModal() {
  // 避免递归调用
  const renderModule = document.querySelector('script[src="/admin/render/control.js"]');
  if (!renderModule) {
    // 如果渲染模块未加载，先加载它
    loadConfigs();
    return;
  }
  
  // 渲染模块已加载，调用其中的函数
  if (window.showAddConfigModal && window.showAddConfigModal !== showAddConfigModal) {
    window.showAddConfigModal();
  }
}

function showEditConfigModal(id) {
  // 避免递归调用
  const renderModule = document.querySelector('script[src="/admin/render/control.js"]');
  if (!renderModule) {
    // 如果渲染模块未加载，先加载它
    loadConfigs();
    return;
  }
  
  // 渲染模块已加载，调用其中的函数
  if (window.showEditConfigModal && window.showEditConfigModal !== showEditConfigModal) {
    window.showEditConfigModal(id);
  }
}

function saveConfig() {
  // 避免递归调用
  const renderModule = document.querySelector('script[src="/admin/render/control.js"]');
  if (!renderModule) {
    // 如果渲染模块未加载，先加载它
    loadConfigs();
    return;
  }
  
  // 渲染模块已加载，调用其中的函数
  if (window.saveConfig && window.saveConfig !== saveConfig) {
    window.saveConfig();
  }
}

function deleteConfig(id) {
  // 避免递归调用
  const renderModule = document.querySelector('script[src="/admin/render/control.js"]');
  if (!renderModule) {
    // 如果渲染模块未加载，先加载它
    loadConfigs();
    return;
  }
  
  // 渲染模块已加载，调用其中的函数
  if (window.deleteConfig && window.deleteConfig !== deleteConfig) {
    window.deleteConfig(id);
  }
}

function showMessage(message, type = 'info') {
  if (window.bootstrap) {
    const toastHtml = `
      <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'success'}" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>`;
    
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      const container = document.createElement('div');
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(container);
    }
    
    const toastElement = document.createElement('div');
    toastElement.innerHTML = toastHtml;
    document.querySelector('.toast-container').appendChild(toastElement.firstElementChild);
    
    const toast = new bootstrap.Toast(document.querySelector('.toast-container .toast:last-child'));
    toast.show();
  } else {
    alert(message);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const configTab = document.getElementById('config-tab');
  if (configTab) {
    configTab.addEventListener('shown.bs.tab', loadConfigs);
  }
  
  const configTabContent = document.getElementById('config');
  if (configTabContent) {
    configTabContent.innerHTML = `
      <div class="container py-4">
        <div id="configTableContainer"></div>
      </div>`;
  }
  
  // 添加Toast容器
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
  }
});

// 当DOM加载完成后，加载渲染组件
document.addEventListener('DOMContentLoaded', function() {
  // 判断是否已加载渲染模块
  if (typeof window.loadConfigs !== 'function') {
    // 动态加载渲染模块
    const script = document.createElement('script');
    script.src = '/admin/render/control.js';
    script.onload = function() {
      console.log('配置管理渲染模块已加载');
      if (typeof window.loadConfigs === 'function') {
        window.loadConfigs();
      }
    };
    document.head.appendChild(script);
  } else {
    // 如果已加载，直接调用
    window.loadConfigs();
  }
});

// 兼容旧版函数调用
function loadConfigs() {
  // 防止递归调用，直接使用从render/control.js加载的loadConfigs
  const renderModule = document.querySelector('script[src="/admin/render/control.js"]');
  if (renderModule) {
    // 渲染模块已加载，不再重复执行
    return;
  }
  
  // 尝试加载渲染模块
  const script = document.createElement('script');
  script.src = '/admin/render/control.js';
  script.onload = function() {
    console.log('配置管理渲染模块已加载');
  };
  document.head.appendChild(script);
}

// 导出全局函数 - 注意：这里不再重新赋值，避免循环引用
// window.loadConfigs赋值会在渲染模块中完成
// window.loadConfigs = loadConfigs;
window.showAddConfigModal = showAddConfigModal;
window.showEditConfigModal = showEditConfigModal;
window.saveConfig = saveConfig;
window.deleteConfig = deleteConfig;
