#!/bin/bash
# 快速更新部署脚本
# 使用方法：在本地执行 ./deploy-update.sh <服务器IP> [项目目录]
# 例如: ./deploy-update.sh 8.130.37.81 /var/www

if [ -z "$1" ]; then
    echo "使用方法: ./deploy-update.sh <服务器IP> [项目目录]"
    echo "例如: ./deploy-update.sh 8.130.37.81 /var/www"
    echo "      ./deploy-update.sh 8.130.37.81 /var/www/hospital"
    exit 1
fi

SERVER_IP=$1
SERVER_USER="root"
PROJECT_DIR="${2:-/var/www}"  # 默认 /var/www，可以通过第二个参数指定

echo "服务器: ${SERVER_USER}@${SERVER_IP}"
echo "项目目录: ${PROJECT_DIR}"

echo "=========================================="
echo "开始部署更新到服务器: $SERVER_IP"
echo "=========================================="

# 1. 打包代码（排除不需要的文件）
echo "1. 打包代码..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='hospital-update.tar.gz' \
    --exclude='.env.local' \
    -czf hospital-update.tar.gz .

if [ $? -ne 0 ]; then
    echo "❌ 打包失败"
    exit 1
fi

echo "✅ 打包完成: hospital-update.tar.gz"

# 2. 上传到服务器
echo "2. 上传到服务器..."
scp hospital-update.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

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

# 备份当前代码（可选）
echo "备份当前代码..."
BACKUP_DIR="../hospital-backup-\$(date +%Y%m%d-%H%M%S)"
cp -r . "\$BACKUP_DIR" 2>/dev/null || true
echo "✅ 备份完成: \$BACKUP_DIR"

# 解压新代码
echo "解压新代码..."
tar -xzf /tmp/hospital-update.tar.gz
echo "✅ 解压完成"

# 重新构建前端
echo "重新构建前端..."
npm install
npm run build
echo "✅ 前端构建完成"

# 更新后端依赖
echo "更新后端依赖..."
cd server
npm install
echo "✅ 后端依赖更新完成"

# 重启后端服务
echo "重启后端服务..."
pm2 restart hospital-backend
echo "✅ 后端服务已重启"

# 重载 Nginx
echo "重载 Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx 已重载"

# 检查服务状态
echo ""
echo "=========================================="
echo "服务状态检查:"
echo "=========================================="
pm2 status
echo ""
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 部署成功！"
    echo "=========================================="
    echo "清理本地临时文件..."
    rm -f hospital-update.tar.gz
    echo "✅ 清理完成"
else
    echo ""
    echo "=========================================="
    echo "❌ 部署失败，请检查错误信息"
    echo "=========================================="
    exit 1
fi

