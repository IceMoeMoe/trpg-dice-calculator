// 构建脚本 - 用于生产环境构建
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('开始构建TRPG掷骰计算器...');

// 检查是否存在node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('node_modules不存在，开始安装依赖...');
  
  // 尝试使用npm安装依赖
  const installProcess = spawn('npm', ['install'], {
    stdio: 'inherit',
    shell: true
  });
  
  installProcess.on('close', (code) => {
    if (code === 0) {
      console.log('依赖安装成功，开始构建...');
      buildProject();
    } else {
      console.error('依赖安装失败');
      process.exit(1);
    }
  });
} else {
  console.log('依赖已存在，开始构建...');
  buildProject();
}

function buildProject() {
  // 构建项目
  const buildProcess = spawn('npx', ['vite', 'build'], {
    stdio: 'inherit',
    shell: true
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('构建成功！');
      console.log('生产文件位于 dist/ 目录');
      console.log('可以使用 npm run preview 预览生产版本');
    } else {
      console.error('构建失败');
      process.exit(1);
    }
  });
}
