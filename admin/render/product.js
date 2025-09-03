// 更新API调用路径，添加/api前缀
// 后备调用方式
async function callProductApi(endpoint, data = {}) {
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

// 商品管理渲染逻辑
// 依赖 window.adminApi

function renderProductTable(products) {
  const wrap = document.getElementById('productTableWrap');
  if (!wrap) return;
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h5 class="mb-0">商品管理</h5>
      <div>
        <button class="btn btn-danger btn-sm me-1" id="batchDeleteProductBtn">批量删除</button>
        <button class="btn btn-primary btn-sm" id="addProductBtn">新增商品</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th><input type="checkbox" id="productCheckAll"></th>
            <th>ID</th><th>名称</th><th>价格</th><th>描述</th><th>商家</th><th>创建时间</th><th>评论</th><th>销量</th><th>图片</th><th>折扣</th><th>特性</th><th>排序</th><th>imggroup</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td><input type='checkbox' class='productCheckItem' value='${p.id}'></td>
              <td>${p.id}</td>
              <td>${p.name}</td>
              <td>${p.price}</td>
              <td>${p.datail || ''}</td>
              <td>${p.belong || ''}</td>
              <td>${p.createdata || ''}</td>
              <td>${p.comment || ''}</td>
              <td>${p.purchaseint || ''}</td>
              <td>${p.pngBase64 ? `<img src="data:image/png;base64,${p.pngBase64}" style="max-width:60px;max-height:60px;"/>` : ''}</td>
              <td>${p.discount ?? ''}</td>
              <td>${Array.isArray(p.features) ? p.features.join(',') : (p.features || '')}</td>
              <td>${p.sort ?? ''}</td>
              <td>${p.imggroup ? (Array.isArray(p.imggroup) ? p.imggroup.join(',') : p.imggroup) : ''}</td>
              <td>
                <button class='btn btn-sm btn-outline-info me-1'>编辑</button>
                <button class='btn btn-sm btn-outline-danger'>删除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="productModalWrap"></div>
  `;
  wrap.innerHTML = html;
  document.getElementById('addProductBtn').onclick = showAddProductModal;
  // 批量选择
  document.getElementById('productCheckAll').onclick = function() {
    document.querySelectorAll('.productCheckItem').forEach(cb => cb.checked = this.checked);
  };
  // 批量删除
  document.getElementById('batchDeleteProductBtn').onclick = function() {
    const ids = Array.from(document.querySelectorAll('.productCheckItem:checked')).map(cb=>cb.value);
    if (!ids.length) return alert('请选择要删除的商品');
    if (!confirm('确定批量删除选中商品？')) return;
    // 批量删除用对象格式
    window.adminApi.deleteProduct({ ids }).then(()=>loadProductTable());
  };
  // 移除内联事件绑定，改为JS绑定
  wrap.querySelectorAll(".btn-outline-info").forEach(btn => {
    btn.onclick = function() {
      const product_id = this.closest('tr').querySelector('.productCheckItem').value;
      adminEditProduct(Number(product_id));
    };
  });
  wrap.querySelectorAll(".btn-outline-danger").forEach(btn => {
    btn.onclick = function() {
      const product_id = this.closest('tr').querySelector('.productCheckItem').value;
      adminDeleteProduct(Number(product_id));
    };
  });
}

function showAddProductModal() {
  showProductModal({});
}
function adminEditProduct(id) {
  const product = window._adminProductList.find(p => p.id === id);
  showProductModal(product || {});
}
function showProductModal(product) {
  const isEdit = !!product.id;
  function getNowStrForInput() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function inputToDateStr(val) {
    if (!val) return '';
    return val.replace('T', ' ') + ':00';
  }
  const merchantList = (window._adminUserList||[]).filter(u=>u.permission==3);
  const modalHtml = `
    <div class="modal fade" id="productModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isEdit ? '编辑商品' : '新增商品'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="productForm">
              ${isEdit ? `<input type="hidden" id="productId" value="${product.id}">` : ''}
              <div class="mb-2"><label>名称</label><input type="text" class="form-control" id="productName" value="${product.name || ''}" required></div>
              <div class="mb-2"><label>价格</label><input type="number" class="form-control" id="productPrice" value="${product.price || ''}" required></div>
              <div class="mb-2"><label>描述</label><input type="text" class="form-control" id="productDatail" value="${product.datail || ''}" placeholder="可空"></div>
              <div class="mb-2"><label>商家</label><select class="form-control" id="productBelong">
                <option value="">请选择商家</option>
                ${merchantList.map(m=>`<option value="${m.username}" ${product.belong==m.username?'selected':''}>${m.username}</option>`).join('')}
              </select></div>
              <div class="mb-2"><label>创建时间</label><input type="datetime-local" class="form-control" id="productCreatedata" value="${product.createdata ? product.createdata.replace(' ', 'T').slice(0,16) : (!isEdit ? getNowStrForInput() : '')}"></div>
              <div class="mb-2"><label>评论</label><input type="text" class="form-control" id="productComment" value="${product.comment || ''}" placeholder="可空"></div>
              <div class="mb-2"><label>销量</label><input type="number" class="form-control" id="productPurchaseint" value="${product.purchaseint || ''}"></div>
              <div class="mb-2"><label>库存</label><input type="number" class="form-control" id="productStock" value="${product.stock ?? 1}" min="0" placeholder="可不填/默认1"></div>
              <div class="mb-2">
                <label>图片（base64）</label>
                <div class="input-group">
                  <textarea class="form-control" id="productPng" rows="2" placeholder="可空">${product.pngBase64 || ''}</textarea>
                  <button class="btn btn-outline-secondary" type="button" id="selectProductImgBtn">选择图片</button>
                </div>
                <div id="productImgPreview" class="mt-2">${product.pngBase64 ? `<img src='data:image/png;base64,${product.pngBase64}' style='max-width:80px;max-height:80px;'/>` : ''}</div>
              </div>
              <div class="mb-2"><label>折扣</label><input type="number" step="0.01" class="form-control" id="productDiscount" value="${product.discount ?? ''}" placeholder="可不填/默认1"></div>
              <div class="mb-2"><label>特性</label><input type="text" class="form-control" id="productFeatures" value="${Array.isArray(product.features) ? product.features.join(',') : (product.features || '')}" placeholder="可空"></div>
              <div class="mb-2"><label>排序</label><input type="number" class="form-control" id="productSort" value="${product.sort ?? ''}" placeholder="可空"></div>
              <div class="mb-2"><label>imggroup</label><input type="text" class="form-control" id="productImggroup" value="${Array.isArray(product.imggroup) ? product.imggroup.join(',') : (product.imggroup || '')}" placeholder="可空"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" id="saveProductBtn">保存</button>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('productModalWrap').innerHTML = modalHtml;
  var modal = new bootstrap.Modal(document.getElementById('productModal'));
  modal.show();
  document.getElementById('selectProductImgBtn').onclick = function() {
    window.selectImageAndToBase64(function(base64) {
      document.getElementById('productPng').value = base64;
      document.getElementById('productImgPreview').innerHTML = `<img src='data:image/png;base64,${base64}' style='max-width:80px;max-height:80px;'/>`;
    });
  };
  document.getElementById('saveProductBtn').onclick = function() {
    const id = isEdit ? document.getElementById('productId').value : undefined;
    const name = document.getElementById('productName').value.trim();
    const price = document.getElementById('productPrice').value.trim();
    const datail = document.getElementById('productDatail').value.trim();
    const belong = document.getElementById('productBelong').value.trim();
    const createdata = inputToDateStr(document.getElementById('productCreatedata').value.trim());
    const comment = document.getElementById('productComment').value.trim();
    const purchaseint = document.getElementById('productPurchaseint').value.trim();
    const stock = document.getElementById('productStock').value.trim();
    const pngBase64 = document.getElementById('productPng').value.trim();
    const discount = document.getElementById('productDiscount').value.trim();
    const features = document.getElementById('productFeatures').value.trim();
    const sort = document.getElementById('productSort').value.trim();
    const imggroup = document.getElementById('productImggroup').value.trim();
    if (!name || !price) {
      alert('请填写必填项');
      return;
    }
    const product = { name, price, datail, belong, createdata, comment, purchaseint, stock, pngBase64, discount, features, sort, imggroup };
    if (isEdit) product.id = id;
    (isEdit ? window.adminApi.editProduct(product) : window.adminApi.addProduct(product)).then(function(res) {
      if (res.success) {
        modal.hide();
        loadProductTable();
      } else {
        alert(res.message || '操作失败');
      }
    });
  };
}
function adminDeleteProduct(id) {
  if (!confirm('确定要删除该商品吗？')) return;
  // 单个删除用对象格式
  window.adminApi.deleteProduct({ id }).then(res => {
    if (res.success) {
      loadProductTable();
    } else {
      alert(res.message || '删除失败');
    }
  });
}
function loadProductTable() {
  window.adminApi.getAllProducts().then(data => {
    if (data.success) {
      window._adminProductList = data.products;
      renderProductTable(data.products);
    } else {
      document.getElementById('productTableWrap').innerHTML = '<div class="alert alert-danger">' + (data.message || '获取商品失败') + '</div>';
    }
  });
}
if (document.getElementById('productTableWrap')) {
  loadProductTable();
  document.getElementById('product-tab').addEventListener('click', loadProductTable);
}
