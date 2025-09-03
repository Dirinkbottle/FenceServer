-- 系统日志表结构
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `type` enum('info','error','warn','debug') NOT NULL DEFAULT 'info',
  `message` varchar(255) NOT NULL,
  `details` text,
  `ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加一些初始日志记录
INSERT INTO `system_logs` (`type`, `message`, `details`, `ip`) VALUES
('info', '系统日志功能已初始化', '系统日志表创建成功', 'system'),
('info', '系统启动', '服务器启动成功', 'system'),
('debug', '配置加载', '加载系统配置项', 'system'),
('info', '用户登录', '管理员登录系统', '127.0.0.1'); 