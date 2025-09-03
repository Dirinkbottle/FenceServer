// 更新API调用路径，添加/api前缀
// 后备调用方式
async function callOrderApi(endpoint, data = {}) {
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

// 订单管理渲染逻辑
// 依赖 window.adminApi

const ORDER_STATUS_MAP = {
  0: { label: '待支付', color: 'secondary' },
  1: { label: '已支付', color: 'info' },
  2: { label: '已发货', color: 'primary' },
  3: { label: '已完成', color: 'success' },
  4: { label: '已关闭', color: 'dark' },
  5: { label: '已取消', color: 'danger' }
};
const PAY_TYPE_MAP = {
  0: { label: '未知', color: 'secondary' },
  1: { label: '钱包', color: 'success' },
  2: { label: '支付宝', color: 'info' },
  3: { label: '银行卡', color: 'primary' }
};
function renderOrderStatus(status) {
  const s = ORDER_STATUS_MAP[status] || { label: status, color: 'secondary' };
  return `<span class='badge bg-${s.color}'>${s.label}</span>`;
}
function renderPayType(type) {
  if (type === '' || type === null || type === undefined) return '';
  const t = PAY_TYPE_MAP[type] || { label: type, color: 'secondary' };
  return `<span class='badge bg-${t.color}'>${t.label}</span>`;
}
function renderOrderTable(orders) {
  const wrap = document.getElementById('orderTableWrap');
  if (!wrap) return;
  let html = `
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
      <h5 class="mb-2 mb-md-0">订单管理</h5>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-danger btn-sm d-flex align-items-center gap-1" id="batchDeleteOrderBtn">
          <i class="bi bi-trash"></i> 批量删除
        </button>
        <button class="btn btn-warning btn-sm d-flex align-items-center gap-1" id="batchSetStatusOrderBtn">
          <i class="bi bi-gear"></i> 修改状态
        </button>
        <select class="form-select form-select-sm d-inline-block w-auto me-1" id="batchOrderStatusSelect">
          <option value="">选择状态</option>
          ${Object.entries(ORDER_STATUS_MAP).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm d-flex align-items-center gap-1" id="addOrderBtn">
          <i class="bi bi-plus-lg"></i> 新增订单
        </button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-hover align-middle table-striped">
        <thead class="table-light">
          <tr>
            <th><input type="checkbox" id="orderCheckAll"></th>
            <th>订单ID</th>
            <th>订单号</th>
            <th>用户信息</th>
            <th>商品</th>
            <th>金额</th>
            <th>状态</th>
            <th>时间</th>
            <th class="text-end">操作</th>
          </tr>
        </thead>
        <tbody id="orderTableBody">
          ${orders.map(o => `
            <tr class="order-row">
              <td><input type='checkbox' class='orderCheckItem' value='${o.order_id}'></td>
              <td class="fw-medium">${o.order_id}</td>
              <td><span class="badge bg-secondary">${o.order_sn}</span></td>
              <td>
                <div>${o.receiver_name}</div>
                <div class="text-muted small">${o.receiver_phone}</div>
              </td>
              <td>
                <div class="d-flex align-items-center">
                  <div class="me-2">${o.prdunctname}</div>
                  <div class="text-muted small">x${o.sumbuy}</div>
                </div>
              </td>
              <td>
                <div>￥${o.pay_amount}</div>
                <div class="text-muted small">运费￥${o.freight_amount}</div>
              </td>
              <td>
                ${renderOrderStatus(o.order_status)}
                <div class="text-muted small mt-1">支付: ${renderPayType(o.pay_type)}</div>
              </td>
              <td>
                <div class="text-muted small">创建: ${o.create_time || ''}</div>
                <div class="text-muted small">支付: ${o.pay_time || ''}</div>
              </td>
              <td class="text-end">
                <div class="d-flex justify-content-end gap-1">
                  <button class='btn btn-sm btn-outline-info rounded-circle' title="编辑">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class='btn btn-sm btn-outline-danger rounded-circle' title="删除">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div id="orderModalWrap"></div>
  `;
  wrap.innerHTML = html;
  
  // 添加加载动画
  const loading = document.createElement('div');
  loading.className = 'd-none text-center my-4';
  loading.id = 'orderLoading';
  loading.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>';
  wrap.appendChild(loading);
  
  // 优化表格行悬停效果
  wrap.querySelectorAll('.order-row').forEach(row => {
    row.addEventListener('mouseenter', () => row.classList.add('bg-body-secondary'));
    row.addEventListener('mouseleave', () => row.classList.remove('bg-body-secondary'));
  });
  document.getElementById('addOrderBtn').onclick = showAddOrderModal;
  document.getElementById('orderCheckAll').onclick = function() {
    document.querySelectorAll('.orderCheckItem').forEach(cb => cb.checked = this.checked);
  };
  document.getElementById('batchDeleteOrderBtn').onclick = function() {
    const ids = Array.from(document.querySelectorAll('.orderCheckItem:checked')).map(cb=>cb.value);
    if (!ids.length) return alert('请选择要删除的订单');
    if (!confirm('确定批量删除选中订单？')) return;
    // 一次性批量请求，body为{ids: [...]}
    window.adminApi.deleteOrder({ ids }).then(()=>loadOrderTable());
  };
  document.getElementById('batchSetStatusOrderBtn').onclick = function() {
    const ids = Array.from(document.querySelectorAll('.orderCheckItem:checked')).map(cb=>cb.value);
    const status = document.getElementById('batchOrderStatusSelect').value;
    if (!ids.length) return alert('请选择要批量修改状态的订单');
    if (!status) return alert('请选择目标状态');
    Promise.all(ids.map(id=>window.adminApi.editOrder({ order_id: id, order_status: status }))).then(()=>loadOrderTable());
  };
  // 移除内联事件绑定，改为JS绑定
  wrap.querySelectorAll(".btn-outline-info").forEach(btn => {
    btn.onclick = function() {
      const order_id = this.closest('tr').querySelector('.orderCheckItem').value;
      adminEditOrder(order_id);
    };
  });
  wrap.querySelectorAll(".btn-outline-danger").forEach(btn => {
    btn.onclick = function() {
      const order_id = this.closest('tr').querySelector('.orderCheckItem').value;
      adminDeleteOrder(order_id);
    };
  });
  
  // 添加列折叠控制（针对移动设备）
  const mobileHideCols = [4, 5, 6]; // 需要隐藏的列索引
  // 创建响应式样式
  const thSelectors = mobileHideCols.map(i => `.table thead th:nth-child(${i})`).join(', ');
  const tdSelectors = mobileHideCols.map(i => `.table tbody td:nth-child(${i})`).join(', ');
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      ${thSelectors}, ${tdSelectors} {
        display: none;
      }
      .card-body {
        padding: 0.75rem;
      }
      .modal-dialog {
        margin: 1rem;
      }
    }
  `;
  wrap.appendChild(style);
}

function showAddOrderModal() {
  showOrderModal({});
}
function adminEditOrder(order_id) {
  const order = window._adminOrderList.find(o => o.order_id == order_id);
  showOrderModal(order || {});
}
function adminDeleteOrder(order_id) {
  if (!confirm('确定要删除该订单吗？')) return;
  // 单个删除也用对象格式
  window.adminApi.deleteOrder({ id: order_id }).then(res => {
    if (res.success) {
      loadOrderTable();
    } else {
      alert(res.message || '删除失败');
    }
  });
}
// 表单字段补全和模板字符串闭合修复（input标签自闭合）
// 全面检查并修正模板字符串和HTML标签闭合
function showOrderModal(order) {
  // 先声明 modal 变量
  let modal;
  const isEdit = !!order.order_id;
  const modalHtml = `
    <div class="modal fade" id="orderModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isEdit ? '编辑订单' : '新增订单'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="orderForm">
              ${isEdit ? `<input type="hidden" id="orderId" value="${order.order_id || ''}" />` : ''}
              <div class="row g-2">
                <div class="col-md-4"><label>订单号</label><input type="text" class="form-control" id="orderSn" value="${order.order_sn || ''}" required /></div>
                <div class="col-md-4"><label>用户ID</label><input type="number" class="form-control" id="userId" value="${order.user_id || ''}" required /></div>
                <div class="col-md-4"><label>商家ID</label><input type="number" class="form-control" id="merchantId" value="${order.merchantId || ''}" required /></div>
                <div class="col-md-4"><label>商品ID</label><input type="number" class="form-control" id="productId" value="${order.product_id || ''}" required /></div>
                <div class="col-md-4"><label>商品名</label><input type="text" class="form-control" id="prdunctname" value="${order.prdunctname || ''}" required /></div>
                <div class="col-md-4"><label>订单状态</label><select class="form-select" id="orderStatus">${Object.entries(ORDER_STATUS_MAP).map(([k,v])=>`<option value="${k}" ${order.order_status==k?'selected':''}>${v.label}</option>`).join('')}</select></div>
                <div class="col-md-4"><label>支付金额（￥）</label><input type="number" step="0.01" class="form-control" id="payAmount" value="${order.pay_amount ?? 0}" /></div>
                <div class="col-md-4"><label>总金额（￥）</label><input type="number" step="0.01" class="form-control" id="totalAmount" value="${order.total_amount ?? 0}" /></div>
                <div class="col-md-4"><label>支付类型</label><select class="form-select" id="payType"><option value="">可空</option>${Object.entries(PAY_TYPE_MAP).map(([k,v])=>`<option value="${k}" ${order.pay_type==k?'selected':''}>${v.label}</option>`).join('')}</select></div>
                <div class="col-md-4"><label>折扣率</label><input type="number" step="0.01" class="form-control" id="discountRate" value="${order.discount_rate ?? 1}" placeholder="1.0为原价" /></div>
                <div class="col-md-4"><label>购买数量</label><input type="number" class="form-control" id="sumbuy" value="${order.sumbuy ?? 1}" required /></div>
                <div class="col-md-4"><label>收货人</label><input type="text" class="form-control" id="receiverName" value="${order.receiver_name || ''}" /></div>
                <div class="col-md-4"><label>收货电话</label><input type="text" class="form-control" id="receiverPhone" value="${order.receiver_phone || ''}" /></div>
                <div class="col-md-4"><label>收货地址</label><textarea class="form-control" id="receiverAddress" rows="3">${order.receiver_address || ''}</textarea></div>
                <div class="col-md-4"><label>运费</label><input type="number" step="0.01" class="form-control" id="freightAmount" value="${order.freight_amount ?? 0}" /></div>
                <div class="col-md-4"><label>快递公司</label><input type="text" class="form-control" id="deliveryCompany" value="${order.delivery_company || ''}" /></div>
                <div class="col-md-4"><label>快递单号</label><input type="text" class="form-control" id="deliverySn" value="${order.delivery_sn || ''}" /></div>
                <div class="col-md-4"><label>创建时间</label><input type="datetime-local" class="form-control" id="createTime" value="${order.create_time ? order.create_time.replace(' ', 'T').slice(0,16) : ''}" /></div>
                <div class="col-md-4"><label>更新时间</label><input type="datetime-local" class="form-control" id="updateTime" value="${order.update_time ? order.update_time.replace(' ', 'T').slice(0,16) : ''}" /></div>
                <div class="col-md-4"><label>支付时间</label><input type="datetime-local" class="form-control" id="payTime" value="${order.pay_time ? order.pay_time.replace(' ', 'T').slice(0,16) : ''}" /></div>
                <div class="col-md-4"><label>关闭时间</label><input type="datetime-local" class="form-control" id="closeTime" value="${order.close_time ? order.close_time.replace(' ', 'T').slice(0,16) : ''}" /></div>
                <div class="col-md-4"><label>发货时间</label><input type="datetime-local" class="form-control" id="deliveryTime" value="${order.delivery_time ? order.delivery_time.replace(' ', 'T').slice(0,16) : ''}" /></div>
                <div class="col-md-4"><label>收货时间</label><input type="datetime-local" class="form-control" id="receiveTime" value="${order.receive_time ? order.receive_time.replace(' ', 'T').slice(0,16) : ''}" /></div>
                <div class="col-md-4"><label>备注</label><input type="text" class="form-control" id="remark" value="${order.remark || ''}" placeholder="可空" /></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" id="saveOrderBtn">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('orderModalWrap').innerHTML = modalHtml;
  // modal DOM 已插入，实例化 modal
  modal = new bootstrap.Modal(document.getElementById('orderModal'));
  modal.show();

  // 添加表单验证提示
  document.querySelectorAll('#orderForm .form-control').forEach(input => {
    input.addEventListener('focus', () => input.classList.add('border-primary'));
    input.addEventListener('blur', () => input.classList.remove('border-primary'));
  });

  // 优化保存按钮交互
  const saveBtn = document.getElementById('saveOrderBtn');
  saveBtn.addEventListener('click', function() {
    this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>保存中...';
    this.disabled = true;
    // ...原有保存逻辑...
    const order_id = isEdit ? document.getElementById('orderId').value : undefined;
    const order_sn = document.getElementById('orderSn').value.trim();
    const user_id = document.getElementById('userId').value.trim();
    const merchantId = document.getElementById('merchantId').value.trim();
    const product_id = document.getElementById('productId').value.trim();
    const prdunctname = document.getElementById('prdunctname').value.trim();
    const order_status = document.getElementById('orderStatus').value.trim();
    const pay_amount = document.getElementById('payAmount').value.trim();
    const total_amount = document.getElementById('totalAmount').value.trim();
    const sumbuy = document.getElementById('sumbuy').value.trim();
    const receiver_name = document.getElementById('receiverName').value.trim();
    const receiver_phone = document.getElementById('receiverPhone').value.trim();
    const receiver_address = document.getElementById('receiverAddress').value.trim();
    const remark = document.getElementById('remark').value.trim();
    const pay_type = document.getElementById('payType').value.trim();
    const freight_amount = document.getElementById('freightAmount').value.trim();
    const delivery_company = document.getElementById('deliveryCompany').value.trim();
    const delivery_sn = document.getElementById('deliverySn').value.trim();
    const create_time = document.getElementById('createTime').value.trim().replace('T', ' ')+':00';
    const update_time = document.getElementById('updateTime').value.trim().replace('T', ' ')+':00';
    const pay_time = document.getElementById('payTime').value.trim().replace('T', ' ')+':00';
    const close_time = document.getElementById('closeTime').value.trim().replace('T', ' ')+':00';
    const delivery_time = document.getElementById('deliveryTime').value.trim().replace('T', ' ')+':00';
    const receive_time = document.getElementById('receiveTime').value.trim().replace('T', ' ')+':00';
    const orderData = { order_id, order_sn, user_id, merchantId, product_id, prdunctname, order_status, pay_amount, total_amount, sumbuy, receiver_name, receiver_phone, receiver_address, remark, pay_type, freight_amount, delivery_company, delivery_sn, create_time, update_time, pay_time, close_time, delivery_time, receive_time };
    function resetSaveButton() {
      saveBtn.innerHTML = '<i class="bi bi-save"></i> 保存';
      saveBtn.disabled = false;
    }
    if (isEdit) {
      window.adminApi.editOrder(orderData).then(function(res) {
        if (res.success) {
          modal.hide();
          loadOrderTable();
        } else {
          alert(res.message || '操作失败');
        }
        resetSaveButton();
      });
    } else {
      window.adminApi.addOrder(orderData).then(function(res) {
        if (res.success) {
          modal.hide();
          loadOrderTable();
        } else {
          alert(res.message || '操作失败');
        }
        resetSaveButton();
      });
    }
  });

  // 添加移动端友好型日期选择器
  if (window.matchMedia('(max-width: 768px)').matches) {
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
      input.type = 'date';
    });
  }

  // 优化模态框滚动体验
  modal._element.addEventListener('shown.bs.modal', () => {
    const formScrollables = document.querySelectorAll('.modal-body .card-body');
    formScrollables.forEach(scrollable => {
      scrollable.style.maxHeight = window.innerHeight * 0.5 + 'px';
      scrollable.style.overflowY = 'auto';
    });
  });
}

let orderLoadTimer;

function loadOrderTable() {
  const wrap = document.getElementById('orderTableWrap');
  if (!wrap) return;
  
  // 显示加载动画
  const loading = document.getElementById('orderLoading');
  if (loading) {
    loading.classList.remove('d-none');
    wrap.querySelector('#orderTableBody')?.remove();
  }
  
  // 添加防抖处理
  clearTimeout(orderLoadTimer);
  orderLoadTimer = setTimeout(async () => {
    try {
      const data = await window.adminApi.getAllOrders();
      if (data.success) {
        window._adminOrderList = data.orders;
        renderOrderTable(data.orders);
        
        // 添加数据加载完成的动画效果
        const rows = document.querySelectorAll('.order-row');
        rows.forEach((row, i) => {
          row.style.opacity = '0';
          setTimeout(() => {
            row.style.transition = 'opacity 0.3s ease-in-out';
            row.style.opacity = '1';
          }, i * 50);
        });
        
        // 恢复原有事件绑定...
      } else {
        wrap.innerHTML = `<div class="alert alert-danger mb-0 rounded-0">${data.message || '获取订单失败'}</div>`;
      }
    } catch (err) {
      wrap.innerHTML = `<div class="alert alert-danger mb-0 rounded-0">网络异常，请检查连接后重试</div>`;
      console.error('[loadOrderTable error]', err);
    } finally {
      if (loading) loading.classList.add('d-none');
    }
  }, 300);
}

// 在页面加载时添加过渡效果
if (document.getElementById('orderTableWrap')) {
  document.getElementById('orderTableWrap').style.opacity = '0';
  loadOrderTable();
  
  // 添加平滑显示效果
  setTimeout(() => {
    document.getElementById('orderTableWrap').style.transition = 'opacity 0.5s ease-in-out';
    document.getElementById('orderTableWrap').style.opacity = '1';
  }, 200);
  
  // 监听tab切换事件
  document.getElementById('order-tab')?.addEventListener('click', () => {
    if (!window._adminOrderList) loadOrderTable();
  });
}

// 在文件末尾添加全局函数暴露（防止重复定义和兼容模块加载）
if (typeof window !== 'undefined') {
  window.loadOrderTable = loadOrderTable;
  window.adminEditOrder = adminEditOrder;
  window.adminDeleteOrder = adminDeleteOrder;
}
