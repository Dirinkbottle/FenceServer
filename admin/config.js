// 参数配置API（内存版/可替换为数据库）
const configs = [
  // 示例数据
  { id: 1, keyname: 'map_api', configname: '地图API', value: 'google', updated_at: new Date().toISOString(), username: 'admin' },
  { id: 2, keyname: 'alipay_mode', configname: '支付宝模式', value: 0, updated_at: new Date().toISOString(), username: 'admin' },
  { id: 3, keyname: 'wechat_pay', configname: '微信钱包', value: 1, updated_at: new Date().toISOString(), username: 'admin' }
];
let nextId = 4;

exports.getAllConfigs = (req, res) => {
  res.json({ success: true, configs });
};

exports.editConfig = (req, res) => {
  const { id, keyname, configname, value } = req.body;
  if (id) {
    // 编辑
    const cfg = configs.find(c => String(c.id) === String(id));
    if (!cfg) return res.json({ success: false, message: '未找到配置项' });
    cfg.value = value;
    cfg.configname = configname;
    cfg.updated_at = new Date().toISOString();
    return res.json({ success: true });
  } else {
    // 新增
    if (!keyname) return res.json({ success: false, message: 'keyname必填' });
    if (configs.some(c => c.keyname === keyname)) return res.json({ success: false, message: 'keyname已存在' });
    configs.push({
      id: nextId++,
      keyname,
      configname,
      value,
      updated_at: new Date().toISOString(),
      username: req.user?.username || 'admin'
    });
    return res.json({ success: true });
  }
};

exports.deleteConfig = (req, res) => {
  const { id } = req.body;
  const idx = configs.findIndex(c => String(c.id) === String(id));
  if (idx === -1) return res.json({ success: false, message: '未找到配置项' });
  configs.splice(idx, 1);
  res.json({ success: true });
};
