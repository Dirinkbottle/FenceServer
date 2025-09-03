// admin.js
// FenceServer 管理后台前端功能函数、权限校验、全局API
// 依赖 jwt-decode（需在 html 引入 https://cdn.jsdelivr.net/npm/jwt-decode/build/jwt-decode.min.js）

// ========== 工具函数与权限校验 ==========
function getToken() {
    let token = localStorage.getItem('token');
    if (!token) {
        const match = document.cookie.match(/(?:^|; )token=([^;]+)/);
        if (match) token = match[1];
    }
    return token;
}

function parseJwt(token) {
    if (window.jwt_decode) {
        try {
            return window.jwt_decode(token);
        } catch (e) {
            return null;
        }
    }
    try {
        const payload = token.split('.')[1];
        return JSON.parse(decodeURIComponent(escape(window.atob(payload))));
    } catch (e) {
        return null;
    }
}

function showNoPermissionMsg() {
    if (window.bootstrap && document.body) {
        let modal = document.getElementById('noPermissionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.innerHTML = `
            <div class="modal fade" id="noPermissionModal" tabindex="-1" aria-labelledby="noPermissionLabel" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title" id="noPermissionLabel">权限不足</h5>
                  </div>
                  <div class="modal-body">
                    您没有管理员权限，无法访问该页面。
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="noPermissionOkBtn">确定</button>
                  </div>
                </div>
              </div>
            </div>`;
            document.body.appendChild(modal);
            document.getElementById('noPermissionOkBtn').onclick = function() {
                window.location.href = '/admin/login.html';
            };
        }
        var bsModal = new bootstrap.Modal(document.getElementById('noPermissionModal'));
        bsModal.show();
    } else {
        alert('无管理员权限');
        window.location.href = '/admin/login.html';
    }
}

function checkAdminPermission() {
    const token = getToken();
    if (!token) {
        alert('请先登录');
        window.location.href = '/admin/login.html';
        return false;
    }
    const payload = parseJwt(token);
    if (!payload || payload.permission !== 1) { // 必须为1才是管理员
        showNoPermissionMsg();
        return false;
    }
    window.currentAdmin = payload;
    return true;
}

// 页面加载强制校验
if (window.location.pathname === '/admin/index.html') {
    checkAdminPermission();
}

// 定时强制校验，防止被绕过
setInterval(() => {
    if (typeof checkAdminPermission !== 'function' || !checkAdminPermission()) {
        window.location.href = '/admin/login.html';
    }
}, 5000);

// 重新设置全局变量（先赋值，再锁定只读）
window.checkAdminPermission = checkAdminPermission;
Object.defineProperty(window, 'checkAdminPermission', {
    value: checkAdminPermission,
    writable: false,
    configurable: false,
});
window.selectImageAndToBase64 = selectImageAndToBase64;

// 必须在所有API函数前定义 safeFetchJson
async function safeFetchJson(url, options = {}) {
  // 自动补全token
  const token = getToken();
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  // 保证Content-Type
  if (!options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }
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
}

// ===== FenceServer 管理后台API封装 =====
// 用户API
async function getAllUsers() {
  return await safeFetchJson('/api/admin/getAllUsers', { method: 'POST' });
}
async function addUser(data) {
  return await safeFetchJson('/api/admin/addUser', { method: 'POST', body: JSON.stringify(data) });
}
async function editUser(data) {
  return await safeFetchJson('/api/admin/editUser', { method: 'POST', body: JSON.stringify(data) });
}
async function deleteUser(data) {
  return await safeFetchJson('/api/admin/deleteUser', { method: 'POST', body: JSON.stringify(data) });
}
// 商品API
async function getAllProducts() {
  return await safeFetchJson('/api/admin/getAllProducts', { method: 'POST' });
}
async function addProduct(data) {
  return await safeFetchJson('/api/admin/addProduct', { method: 'POST', body: JSON.stringify(data) });
}
async function editProduct(data) {
  return await safeFetchJson('/api/admin/editProduct', { method: 'POST', body: JSON.stringify(data) });
}
async function deleteProduct(data) {
  return await safeFetchJson('/api/admin/deleteProduct', { method: 'POST', body: JSON.stringify(data) });
}
// 订单API
async function getAllOrders() {
  return await safeFetchJson('/api/admin/getAllOrders', { method: 'POST' });
}
async function addOrder(data) {
  return await safeFetchJson('/api/admin/addOrder', { method: 'POST', body: JSON.stringify(data) });
}
async function editOrder(data) {
  return await safeFetchJson('/api/admin/editOrder', { method: 'POST', body: JSON.stringify(data) });
}
async function deleteOrder(data) {
  return await safeFetchJson('/api/admin/deleteOrder', { method: 'POST', body: JSON.stringify(data) });
}
// 配置API
async function getAllConfigs() {
  return await safeFetchJson('/api/admin/getAllConfigs', { method: 'POST' });
}
async function editConfig(data) {
  return await safeFetchJson('/api/admin/editConfig', { method: 'POST', body: JSON.stringify(data) });
}
async function deleteConfig(data) {
  return await safeFetchJson('/api/admin/deleteConfig', { method: 'POST', body: JSON.stringify(data) });
}

// 修改为普通const定义，不用export
const adminApi = {
  getAllUsers: getAllUsers,
  addUser: addUser,
  editUser: editUser,
  deleteUser: deleteUser,
  getAllProducts: getAllProducts,
  addProduct: addProduct,
  editProduct: editProduct,
  deleteProduct: deleteProduct,
  getAllOrders: getAllOrders,
  addOrder: addOrder,
  editOrder: editOrder,
  deleteOrder: deleteOrder,
  getAllConfigs: getAllConfigs,
  editConfig: editConfig,
  deleteConfig: deleteConfig
};

// 统一在adminApi定义后挂载全局变量
window.adminApi = adminApi;
window.getAllUsers = getAllUsers;
window.addUser = addUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.getAllProducts = getAllProducts;
window.addProduct = addProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.getAllOrders = getAllOrders;
window.addOrder = addOrder;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
window.getAllConfigs = getAllConfigs;
window.editConfig = editConfig;
window.deleteConfig = deleteConfig;

// ===== FenceServer 管理后台渲染逻辑拆分 =====
// 动态加载渲染脚本，兼容多种加载方式
function loadRenderModules() {
  try {
    // 尝试使用import动态加载（仅在支持ES模块的浏览器中有效）
    import('./render/user.js').catch(err => console.warn('用户管理渲染模块加载失败', err));
    import('./render/product.js').catch(err => console.warn('商品管理渲染模块加载失败', err));
    import('./render/order.js').catch(err => console.warn('订单管理渲染模块加载失败', err));
    import('./render/control.js').catch(err => console.warn('配置管理渲染模块加载失败', err));
  } catch (e) {
    console.warn('动态导入不受支持，使用script标签加载');
    // 在不支持ES模块的环境中，尝试使用script标签加载
    // 但index.html已经处理了这些加载，所以这里不再重复操作
  }
}

// 尝试加载渲染模块
loadRenderModules();

// 退出登录/切换账户
window.logoutAdmin = function() {
  localStorage.removeItem('token');
  document.cookie = 'token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  window.location.href = '/admin/login.html';
};

// 选择图片并转base64（全局可用）
function selectImageAndToBase64(callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 添加图片压缩逻辑
    compressImage(file, function(compressedBase64) {
      callback(compressedBase64.replace(/^data:image\/[^;]+;base64,/, ''));
    });
  };
  input.click();
}

// 图片压缩函数
function compressImage(file, callback, maxWidth = 800, maxHeight = 800, quality = 0.8) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      // 计算缩放比例
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      // 创建canvas并绘制压缩后的图像
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为base64
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      callback(compressedBase64);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

window.selectImageAndToBase64 = selectImageAndToBase64;
window.compressImage = compressImage;
