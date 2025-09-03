// 分类管理渲染与交互逻辑
let categoryData = {
  categories: []
};

// 统一加载分类数据的函数
async function loadCategories() {
  const wrap = document.getElementById('categoryTableWrap');
  if (!wrap) return;
  
  wrap.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2">加载中...</p></div>';
  
  try {
    // 使用全局API函数
    const res = await window.adminApi?.getAllCategories?.() || 
                await fetch('/api/admin/getAllCategories', { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  } 
                }).then(r=>r.json());
    
    if (!res.success) throw new Error(res.message || '获取失败');
    categoryData.categories = res.categories || [];
    renderCategoryTable(categoryData.categories);
  } catch (e) {
    wrap.innerHTML = `<div class="alert alert-danger">${e.message || '加载分类数据失败'}</div>`;
    console.error('加载分类失败', e);
  }
}

// 渲染分类表格
function renderCategoryTable(categories) {
  const wrap = document.getElementById('categoryTableWrap');
  if (!wrap) return;
  
  if (!categories || categories.length === 0) {
    wrap.innerHTML = '<div class="alert alert-info">暂无分类数据</div>';
    return;
  }
  
  let html = `
    <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th width="50"><input type="checkbox" id="categoryCheckAll"></th>
            <th>ID</th>
            <th>分类名称</th>
            <th>分类描述</th>
            <th>图标</th>
            <th>排序</th>
            <th>父级分类</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  categories.forEach(category => {
    const parentCategory = categories.find(c => c.id === category.parent_id);
    
    html += `
      <tr data-id="${category.id}">
        <td><input type="checkbox" class="categoryCheckItem" value="${category.id}"></td>
        <td>${category.id}</td>
        <td>${category.name}</td>
        <td>${category.description || '-'}</td>
        <td>${category.icon ? `<i class="bi bi-${category.icon}"></i> ${category.icon}` : '-'}</td>
        <td>${category.sort || 0}</td>
        <td>${parentCategory ? parentCategory.name : '-'}</td>
        <td>${category.created_at || '-'}</td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary edit-category-btn">编辑</button>
            <button class="btn btn-outline-danger delete-category-btn">删除</button>
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
      <button class="btn btn-danger btn-sm" id="batchDeleteCategoryBtn">批量删除</button>
    </div>
  `;
  
  wrap.innerHTML = html;
  
  // 全选/取消全选
  document.getElementById('categoryCheckAll')?.addEventListener('change', function() {
    document.querySelectorAll('.categoryCheckItem').forEach(item => {
      item.checked = this.checked;
    });
  });
  
  // 批量删除
  document.getElementById('batchDeleteCategoryBtn')?.addEventListener('click', function() {
    const selectedIds = Array.from(document.querySelectorAll('.categoryCheckItem:checked')).map(item => item.value);
    if (selectedIds.length === 0) {
      alert('请先选择要删除的分类');
      return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedIds.length} 个分类吗？`)) {
      deleteCategories(selectedIds);
    }
  });
  
  // 编辑按钮
  document.querySelectorAll('.edit-category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.closest('tr').dataset.id;
      const category = categoryData.categories.find(c => c.id == id);
      if (category) {
        showCategoryModal(category);
      }
    });
  });
  
  // 删除按钮
  document.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.closest('tr').dataset.id;
      if (confirm('确定要删除此分类吗？')) {
        deleteCategories([id]);
      }
    });
  });
}

// 显示分类编辑/新增模态框
function showCategoryModal(category = {}) {
  const isEdit = !!category.id;
  
  // 创建模态框HTML
  let modalHtml = `
    <div class="modal fade" id="categoryModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${isEdit ? '编辑' : '新增'}分类</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="categoryForm">
              ${isEdit ? `<input type="hidden" id="categoryId" value="${category.id}">` : ''}
              
              <div class="mb-3">
                <label class="form-label">分类名称</label>
                <input type="text" class="form-control" id="categoryName" value="${category.name || ''}" required>
              </div>
              
              <div class="mb-3">
                <label class="form-label">分类描述</label>
                <textarea class="form-control" id="categoryDescription" rows="2">${category.description || ''}</textarea>
              </div>
              
              <div class="mb-3">
                <label class="form-label">图标 (Bootstrap 图标名称)</label>
                <input type="text" class="form-control" id="categoryIcon" value="${category.icon || ''}" placeholder="例如: tag">
                <small class="form-text text-muted">访问 <a href="https://icons.getbootstrap.com/" target="_blank">Bootstrap Icons</a> 查看图标名称</small>
              </div>
              
              <div class="mb-3">
                <label class="form-label">排序</label>
                <input type="number" class="form-control" id="categorySort" value="${category.sort || 0}" min="0">
                <small class="form-text text-muted">数字越小排序越靠前</small>
              </div>
              
              <div class="mb-3">
                <label class="form-label">父级分类</label>
                <select class="form-select" id="categoryParentId">
                  <option value="">无 (顶级分类)</option>
                  ${categoryData.categories
                    .filter(c => c.id != category.id) // 排除自己，防止自引用
                    .map(c => `<option value="${c.id}" ${c.id == category.parent_id ? 'selected' : ''}>${c.name}</option>`)
                    .join('')
                  }
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button type="button" class="btn btn-primary" id="saveCategoryBtn">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 移除已存在的模态框
  const existingModal = document.getElementById('categoryModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 添加模态框到DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // 显示模态框
  const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
  modal.show();
  
  // 保存按钮事件
  document.getElementById('saveCategoryBtn').addEventListener('click', function() {
    const form = document.getElementById('categoryForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const categoryData = {
      name: document.getElementById('categoryName').value.trim(),
      description: document.getElementById('categoryDescription').value.trim(),
      icon: document.getElementById('categoryIcon').value.trim(),
      sort: parseInt(document.getElementById('categorySort').value) || 0,
      parent_id: document.getElementById('categoryParentId').value || null
    };
    
    if (isEdit) {
      categoryData.id = document.getElementById('categoryId').value;
    }
    
    saveCategory(categoryData, modal);
  });
}

// 保存分类数据
async function saveCategory(data, modal) {
  try {
    const isEdit = !!data.id;
    const action = isEdit ? 'editCategory' : 'addCategory';
    
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
    alert(isEdit ? '分类已更新' : '分类已添加');
    loadCategories(); // 重新加载数据
  } catch (e) {
    alert('保存失败: ' + e.message);
    console.error('保存分类失败', e);
  }
}

// 删除分类
async function deleteCategories(ids) {
  try {
    // 使用全局API函数或直接发送请求
    const res = await window.adminApi?.deleteCategory?.({ ids }) || 
                await fetch('/api/admin/deleteCategory', { 
                  method: 'POST', 
                  headers: { 
                    'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '', 
                    'Content-Type': 'application/json' 
                  },
                  body: JSON.stringify({ ids })
                }).then(r=>r.json());
    
    if (!res.success) throw new Error(res.message || '删除失败');
    
    alert('分类已删除');
    loadCategories(); // 重新加载数据
  } catch (e) {
    alert('删除失败: ' + e.message);
    console.error('删除分类失败', e);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 添加按钮事件
  document.getElementById('addCategoryBtn')?.addEventListener('click', function() {
    showCategoryModal();
  });
  
  // 刷新按钮事件
  document.getElementById('refreshCategoriesBtn')?.addEventListener('click', loadCategories);
  
  // Tab切换时加载数据
  document.getElementById('category-tab')?.addEventListener('click', loadCategories);
  
  // 如果已在该Tab，自动加载
  if (document.getElementById('category')?.classList.contains('show')) {
    loadCategories();
  }
});

// 全局导出
window.loadCategories = loadCategories;
window.showCategoryModal = showCategoryModal; 