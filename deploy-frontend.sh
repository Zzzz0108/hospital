#!/bin/bash
# 快速更新前端脚本（只更新前端代码）
# 使用方法：./deploy-frontend.sh <服务器IP>
# 例如: ./deploy-frontend.sh 8.130.37.81

if [ -z "$1" ]; then
    echo "使用方法: ./deploy-frontend.sh <服务器IP>"
    echo "例如: ./deploy-frontend.sh 8.130.37.81"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="root"
PROJECT_DIR="/var/www"

echo "=========================================="
echo "开始更新前端到服务器: $SERVER_IP"
echo "项目目录: $PROJECT_DIR"
echo "=========================================="

# 1. 打包前端相关文件
echo "1. 打包前端文件..."

# 创建临时文件列表
FILE_LIST="src/ index.html vite.config.js package.json deploy-frontend.sh deploy-update.sh"

# 添加可选文件（如果存在）
[ -f "package-lock.json" ] && FILE_LIST="$FILE_LIST package-lock.json"
[ -f ".env.production" ] && FILE_LIST="$FILE_LIST .env.production"

tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='server' \
    --exclude='*.tar.gz' \
    --exclude='.env.local' \
    -czf frontend-update.tar.gz \
    $FILE_LIST

if [ $? -ne 0 ]; then
    echo "❌ 打包失败"
    exit 1
fi

echo "✅ 打包完成: frontend-update.tar.gz"

# 2. 上传到服务器
echo "2. 上传到服务器..."
scp frontend-update.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

if [ $? -ne 0 ]; then
    echo "❌ 上传失败"
    exit 1
fi

echo "✅ 上传完成"

# 3. 在服务器上执行更新
echo "3. 在服务器上执行更新..."
ssh ${SERVER_USER}@${SERVER_IP} << EOF
set -e

cd ${PROJECT_DIR}

# 解压新代码
echo "解压前端文件..."
tar -xzf /tmp/frontend-update.tar.gz
echo "✅ 解压完成"

# 重新构建前端
echo "重新构建前端..."
npm install
npm run build
echo "✅ 前端构建完成"

# 重载 Nginx
echo "重载 Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx 已重载"

# 检查服务状态
echo ""
echo "=========================================="
echo "服务状态检查:"
echo "=========================================="
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "=========================================="
echo "✅ 前端更新完成！"
echo "=========================================="
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 部署成功！"
    echo "=========================================="
    echo "清理本地临时文件..."
    rm -f frontend-update.tar.gz
    echo "✅ 清理完成"
else
    echo ""
    echo "=========================================="
    echo "❌ 部署失败，请检查错误信息"
    echo "=========================================="
    exit 1
fi

