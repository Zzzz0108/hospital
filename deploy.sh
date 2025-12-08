#!/bin/bash

# 阿里云 ECS 部署脚本
# 使用方法：在服务器上执行 bash deploy.sh

set -e

echo "开始部署医院测试系统..."

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未安装 Node.js，请先安装 Node.js 20.x"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js 版本: $NODE_VERSION"

# 2. 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo "警告: 未检测到 MySQL，请确保已安装并配置数据库"
fi

# 3. 安装前端依赖
echo "安装前端依赖..."
npm install

# 4. 构建前端
echo "构建前端..."
npm run build

# 5. 安装后端依赖
echo "安装后端依赖..."
cd server
npm install

# 6. 创建日志目录
mkdir -p logs

# 7. 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    npm install -g pm2
fi

# 8. 启动/重启后端服务
echo "启动后端服务..."
if pm2 list | grep -q "hospital-backend"; then
    echo "重启现有服务..."
    pm2 restart ecosystem.config.js
else
    echo "启动新服务..."
    pm2 start ecosystem.config.js
    pm2 save
fi

# 9. 显示状态
echo ""
echo "部署完成！"
echo ""
echo "服务状态："
pm2 status
echo ""
echo "查看日志：pm2 logs hospital-backend"
echo "重启服务：pm2 restart hospital-backend"

