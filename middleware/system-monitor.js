const os = require('os');
const osUtils = require('os-utils');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs');

// 存储系统信息
let systemInfo = {
  cpu: 0,
  memory: 0,
  disk: 0,
  uptime: 0,
  platform: os.platform()
};

// 获取CPU使用率(Promise封装)
function getCpuUsage() {
  return new Promise((resolve) => {
    osUtils.cpuUsage(function(value) {
      resolve(Math.round(value * 100));
    });
  });
}

// 更新系统信息
async function updateSystemInfo() {
  try {
    // 获取CPU使用率 (使用Promise等待结果)
    systemInfo.cpu = await getCpuUsage();

    // 获取内存使用率
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    systemInfo.memory = Math.round((totalMem - freeMem) / totalMem * 100);

    // 获取磁盘使用率 (使用系统主分区)
    const fsData = await si.fsSize();
    if (fsData && fsData.length > 0) {
      // 选择系统所在分区
      let mainPartition;
      
      if (systemInfo.platform === 'win32') {
        // Windows系统，查找C盘
        mainPartition = fsData.find(disk => disk.mount.startsWith('C:'));
        if (!mainPartition && fsData.length > 0) {
          mainPartition = fsData[0]; // 如果找不到C盘，使用第一个分区
        }
      } else {
        // Linux系统，查找根目录
        mainPartition = fsData.find(disk => disk.mount === '/');
        if (!mainPartition && fsData.length > 0) {
          mainPartition = fsData[0]; // 如果找不到根目录，使用第一个分区
        }
      }
      
      if (mainPartition) {
        systemInfo.disk = Math.round(mainPartition.use);
        console.log(`使用磁盘分区: ${mainPartition.mount}, 使用率: ${mainPartition.use}%`);
      }
    }

    // 系统运行时间（小时）
    systemInfo.uptime = Math.round(os.uptime() / 3600 * 10) / 10;
    
    console.log(`系统信息已更新: CPU=${systemInfo.cpu}%, 内存=${systemInfo.memory}%, 磁盘=${systemInfo.disk}%, 运行时间=${systemInfo.uptime}小时`);
  } catch (error) {
    console.error('获取系统信息出错:', error);
  }
}

// 初始更新系统信息
updateSystemInfo();

// 每5秒更新一次系统信息
setInterval(updateSystemInfo, 5000);

// 提供获取系统信息的API
function getSystemInfo() {
  return {
    ...systemInfo,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getSystemInfo
}; 