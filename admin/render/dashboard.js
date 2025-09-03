// 仪表盘渲染与数据加载逻辑
let dashboardData = {
  salesTrend: [],
  topProducts: [],
  systemStatus: {},
  todoItems: {}
};

// 加载仪表盘数据
async function loadDashboard() {
  try {
    // 销毁已存在的图表实例，防止重复创建
    if (window.salesTrendChart instanceof Chart) {
      window.salesTrendChart.destroy();
    }
    window.salesTrendChart = null;
    
    if (window.topProductsChart instanceof Chart) {
      window.topProductsChart.destroy();
    }
    window.topProductsChart = null;
    
    // 初始化图表
    initSalesTrendChart();
    initTopProductsChart();
    
    // 获取销售趋势数据
    const salesTrendRes = await fetch('/api/admin/getSalesTrend', {
      method: 'POST', 
      headers: {
        'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '',
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()).catch(() => ({ success: false }));
    
    // 获取热门商品数据
    const topProductsRes = await fetch('/api/admin/getTopProducts', {
      method: 'POST', 
      headers: {
        'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '',
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()).catch(() => ({ success: false }));
    
    // 获取系统状态数据
    const systemStatusRes = await fetch('/api/admin/getSystemStatus', {
      method: 'POST', 
      headers: {
        'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '',
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()).catch(() => ({ success: false }));
    
    // 获取待办事项数据
    const todoItemsRes = await fetch('/api/admin/getTodoItems', {
      method: 'POST', 
      headers: {
        'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '',
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()).catch(() => ({ success: false }));
    
    // 更新图表和数据
    if (salesTrendRes.success) {
      dashboardData.salesTrend = salesTrendRes.data;
      updateSalesTrendChart(salesTrendRes.data);
    }
    
    if (topProductsRes.success) {
      dashboardData.topProducts = topProductsRes.data;
      updateTopProductsChart(topProductsRes.data);
    }
    
    if (systemStatusRes.success) {
      dashboardData.systemStatus = systemStatusRes.data;
      updateSystemStatus(systemStatusRes.data);
    }
    
    if (todoItemsRes.success) {
      dashboardData.todoItems = todoItemsRes.data;
      updateTodoItems(todoItemsRes.data);
    }
  } catch (error) {
    console.error('加载仪表盘数据失败:', error);
    // 提示错误信息但继续使用模拟数据
    return Promise.reject(error); // 确保错误被传递，以便触发备用的模拟数据
  }
}

// 初始化销售趋势图表
function initSalesTrendChart() {
  const canvas = document.getElementById('salesTrendChart');
  if (!canvas) {
    console.error('找不到销售趋势图表的Canvas元素');
    return false;
  }
  
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('无法获取Canvas 2D上下文');
      return false;
    }
    
    // 销售趋势图配置
    window.salesTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['一月', '二月', '三月', '四月', '五月', '六月'],
        datasets: [{
          label: '销售额',
          data: [0, 0, 0, 0, 0, 0],
          borderColor: '#4e73df',
          backgroundColor: 'rgba(78, 115, 223, 0.05)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false,
            text: '',
            position: 'center',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('初始化销售趋势图表失败:', error);
    return false;
  }
}

// 初始化热门商品图表
function initTopProductsChart() {
  const canvas = document.getElementById('topProductsChart');
  if (!canvas) {
    console.error('找不到热门商品图表的Canvas元素');
    return false;
  }
  
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('无法获取Canvas 2D上下文');
      return false;
    }
    
    // 热门商品图配置
    window.topProductsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['商品1', '商品2', '商品3', '商品4', '商品5'],
        datasets: [{
          label: '销量',
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            'rgba(78, 115, 223, 0.7)',
            'rgba(28, 200, 138, 0.7)',
            'rgba(246, 194, 62, 0.7)',
            'rgba(231, 74, 59, 0.7)',
            'rgba(54, 185, 204, 0.7)'
          ],
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              drawBorder: false
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: false,
            text: '',
            position: 'center',
            font: {
              size: 16
            }
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('初始化热门商品图表失败:', error);
    return false;
  }
}

// 更新销售趋势图表
function updateSalesTrendChart(data) {
  if (!window.salesTrendChart || typeof window.salesTrendChart.update !== 'function') {
    console.error('销售趋势图表实例不存在或无效');
    return;
  }
  
  if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) {
    console.error('销售趋势数据无效:', data);
    return;
  }
  
  
  // 如果没有有效数据（所有月份销售额为0），则显示提示信息
  const hasData = data.values.some(value => value > 0);
  
  if (!hasData) {
    // 在图表上显示无数据提示
    window.salesTrendChart.data.labels = data.labels;
    window.salesTrendChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
    window.salesTrendChart.options.plugins.title = {
      display: true,
      text: '暂无销售数据',
      position: 'center',
      font: {
        size: 16
      }
    };
  } else {
    // 显示正常数据
    window.salesTrendChart.data.labels = data.labels;
    window.salesTrendChart.data.datasets[0].data = data.values;
    window.salesTrendChart.options.plugins.title = {
      display: false
    };
  }
  
  try {
    window.salesTrendChart.update();
  } catch (error) {
    console.error('更新销售趋势图表失败:', error);
  }
}

// 更新热门商品图表
function updateTopProductsChart(data) {
  if (!window.topProductsChart || typeof window.topProductsChart.update !== 'function') {
    console.error('热门商品图表实例不存在或无效');
    return;
  }
  
  if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) {
    console.error('热门商品数据无效:', data);
    return;
  }
  
  
  // 如果没有有效数据，则显示提示信息
  const hasData = data.values.some(value => value > 0);
  
  if (!hasData || data.labels.length === 0) {
    // 在图表上显示无数据提示
    window.topProductsChart.data.labels = ['暂无数据'];
    window.topProductsChart.data.datasets[0].data = [0];
    window.topProductsChart.options.plugins.title = {
      display: true,
      text: '暂无商品销售数据',
      position: 'center',
      font: {
        size: 16
      }
    };
  } else {
    // 显示正常数据
    window.topProductsChart.data.labels = data.labels;
    window.topProductsChart.data.datasets[0].data = data.values;
    window.topProductsChart.options.plugins.title = {
      display: false
    };
  }
  
  try {
    window.topProductsChart.update();
  } catch (error) {
    console.error('更新热门商品图表失败:', error);
  }
}

// 更新系统状态
function updateSystemStatus(data) {
  if (!data) return;
  
  
  // CPU使用率
  if (data.cpu !== undefined) {
    // 获取显示CPU使用率的元素
    const cpuBadges = document.querySelectorAll('.d-flex.justify-content-between.align-items-center .badge');
    const cpuBadge = cpuBadges[0]; // 第一个badge是CPU
    
    // 获取CPU进度条
    const progressBars = document.querySelectorAll('.progress-bar');
    const cpuBar = progressBars[0]; // 第一个progress-bar是CPU
    
    if (cpuBar) {
      cpuBar.style.width = data.cpu + '%';
    }
    
    if (cpuBadge) {
      cpuBadge.textContent = data.cpu + '%';
    }
  }
  
  // 内存使用率
  if (data.memory !== undefined) {
    // 获取显示内存使用率的元素
    const memoryBadges = document.querySelectorAll('.d-flex.justify-content-between.align-items-center .badge');
    const memoryBadge = memoryBadges[1]; // 第二个badge是内存
    
    // 获取内存进度条
    const progressBars = document.querySelectorAll('.progress-bar');
    const memoryBar = progressBars[1]; // 第二个progress-bar是内存
    
    if (memoryBar) {
      memoryBar.style.width = data.memory + '%';
    }
    
    if (memoryBadge) {
      memoryBadge.textContent = data.memory + '%';
    }
  }
  
  // 磁盘使用率
  if (data.disk !== undefined) {
    // 获取显示磁盘使用率的元素
    const diskBadges = document.querySelectorAll('.d-flex.justify-content-between.align-items-center .badge');
    const diskBadge = diskBadges[2]; // 第三个badge是磁盘
    
    // 获取磁盘进度条
    const progressBars = document.querySelectorAll('.progress-bar');
    const diskBar = progressBars[2]; // 第三个progress-bar是磁盘
    
    if (diskBar) {
      diskBar.style.width = data.disk + '%';

    }
    
    if (diskBadge) {
      diskBadge.textContent = data.disk + '%';

    }
  }
  
  // 系统运行时间
  if (data.uptime) {
    // 获取显示系统运行时间的元素
    const uptimeBadges = document.querySelectorAll('.d-flex.justify-content-between.align-items-center .badge');
    const uptimeLabel = uptimeBadges[3]; // 第四个badge是系统运行时间
    
    if (uptimeLabel) {
      uptimeLabel.textContent = data.uptime;
    }
  }
}

// 更新待办事项
function updateTodoItems(data) {
  if (!data) return;
  
  // 待处理订单
  if (data.pendingOrders !== undefined) {
    const pendingOrdersElement = document.getElementById('pendingOrders');
    if (pendingOrdersElement) {
      pendingOrdersElement.textContent = data.pendingOrders;
    }
  }
  
  // 库存预警
  if (data.stockWarnings !== undefined) {
    const stockWarningsElement = document.getElementById('stockWarnings');
    if (stockWarningsElement) {
      stockWarningsElement.textContent = data.stockWarnings;
    }
  }
  
  // 最晚下单时间
  if (data.latestOrderTime !== undefined) {
    const latestPendingElement = document.getElementById('latestPending');
    if (latestPendingElement) {
      latestPendingElement.textContent = data.latestOrderTime || '无';
    }
  }
  
  // 本月收入和总收入
  if (data.monthRevenue !== undefined) {
    const monthRevenueElement = document.getElementById('monthRevenue');
    if (monthRevenueElement) {
      monthRevenueElement.textContent = '￥' + data.monthRevenue;
    }
  }
  
  if (data.totalRevenue !== undefined) {
    const totalRevenueElement = document.getElementById('totalRevenue');
    if (totalRevenueElement) {
      totalRevenueElement.textContent = '￥' + data.totalRevenue;
    }
  }
  
  // 下面是原有的用户反馈和系统通知更新代码
  const badges = document.querySelectorAll('.list-group-item .badge');
  
  // 用户反馈
  if (data.userFeedbacks !== undefined && badges[2]) {
    badges[2].textContent = data.userFeedbacks;
  }
  
  // 系统通知
  if (data.systemNotices !== undefined && badges[3]) {
    badges[3].textContent = data.systemNotices;
  }
}

// 模拟数据（当API未实现时使用）
function loadMockData() {
  // 检查图表实例是否存在，如果不存在则初始化
  if (!window.salesTrendChart) {
    initSalesTrendChart();
  }
  
  if (!window.topProductsChart) {
    initTopProductsChart();
  }
  
  // 如果初始化后仍然不存在图表实例，则跳过更新
  if (!window.salesTrendChart || !window.topProductsChart) {
    console.error('无法初始化图表实例，跳过数据更新');
    return;
  }
  
  // 销售趋势模拟数据
  const mockSalesTrend = {
    labels: ['一月', '二月', '三月', '四月', '五月', '六月'],
    values: [3200, 4100, 3800, 5100, 4800, 6200]
  };
  
  // 热门商品模拟数据
  const mockTopProducts = {
    labels: ['农家大米', '有机蔬菜', '水果礼盒', '土鸡蛋', '手工豆腐'],
    values: [152, 121, 94, 81, 72]
  };
  
  // 系统状态模拟数据
  const mockSystemStatus = {
    cpu: 30,
    memory: 45,
    disk: 65,
    uptime: '3天4小时'
  };
  
  // 待办事项模拟数据
  const mockTodoItems = {
    pendingOrders: 5,
    stockWarnings: 3,
    userFeedbacks: 7,
    systemNotices: 2,
    latestOrderTime: '2023-12-15 14:30',
    monthRevenue: '0.00',
    totalRevenue: '0.02'
  };
  
  // 更新图表和数据
  updateSalesTrendChart(mockSalesTrend);
  updateTopProductsChart(mockTopProducts);
  updateSystemStatus(mockSystemStatus);
  updateTodoItems(mockTodoItems);
}

// 快捷操作按钮事件
function initQuickActions() {
  // 备份数据库
  document.querySelector('button.btn-outline-primary')?.addEventListener('click', function() {
    alert('备份数据库功能正在开发中...');
  });
  
  // 导出订单报表
  document.querySelector('button.btn-outline-success')?.addEventListener('click', function() {
    alert('导出订单报表功能正在开发中...');
  });
  
  // 刷新缓存
  document.querySelector('button.btn-outline-info')?.addEventListener('click', function() {
    alert('刷新缓存功能正在开发中...');
  });
  
  // 发送系统通知
  document.querySelector('button.btn-outline-warning')?.addEventListener('click', function() {
    if (typeof showNotificationModal === 'function') {
      showNotificationModal();
    } else {
      alert('发送系统通知功能正在开发中...');
    }
  });
}

// 定时刷新系统状态
let systemStatusTimer;

// 定时刷新系统状态
async function startSystemStatusRefresh() {
  // 清除之前的定时器
  if (systemStatusTimer) {
    clearInterval(systemStatusTimer);
  }
  
  // 立即加载一次
  try {
    const systemStatusRes = await fetch('/api/admin/getSystemStatus', {
      method: 'POST', 
      headers: {
        'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '',
        'Content-Type': 'application/json'
      }
    }).then(res => res.json());
    
    if (systemStatusRes.success) {
      updateSystemStatus(systemStatusRes.data);
    }
  } catch (error) {
    console.error('加载系统状态失败:', error);
  }
  
  // 设置定时刷新 (每10秒)
  systemStatusTimer = setInterval(async () => {
    try {
      const systemStatusRes = await fetch('/api/admin/getSystemStatus', {
        method: 'POST', 
        headers: {
          'Authorization': localStorage.getItem('token') ? 'Bearer ' + localStorage.getItem('token') : '',
          'Content-Type': 'application/json'
        }
      }).then(res => res.json());
      
      if (systemStatusRes.success) {
        updateSystemStatus(systemStatusRes.data);
      }
    } catch (error) {
      console.error('加载系统状态失败:', error);
    }
  }, 10000);
}

// 停止系统状态刷新
function stopSystemStatusRefresh() {
  if (systemStatusTimer) {
    clearInterval(systemStatusTimer);
    systemStatusTimer = null;
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 初始化快捷操作按钮
  initQuickActions();
  
  // 加载仪表盘数据，优先使用真实数据
  loadDashboard().catch(() => {
    console.log('无法从API加载数据，使用模拟数据');
    loadMockData();
  });
  
  // 如果当前是dashboard页面，启动系统状态刷新
  if (document.getElementById('dashboard').classList.contains('active')) {
    startSystemStatusRefresh();
  }
  
  // Tab切换时重新加载数据
  document.getElementById('dashboard-tab')?.addEventListener('click', function() {
    // 尝试从API加载数据，如果失败则使用模拟数据
    loadDashboard().catch(() => loadMockData());
    // 启动系统状态刷新
    startSystemStatusRefresh();
  });
  
  // 其他Tab切换时停止刷新
  const otherTabs = document.querySelectorAll('.nav-link:not(#dashboard-tab)');
  otherTabs.forEach(tab => {
    tab.addEventListener('click', stopSystemStatusRefresh);
  });
});

// 全局导出
window.loadDashboard = loadDashboard; 