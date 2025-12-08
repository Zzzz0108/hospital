# 阿里云 ECS 部署指南

## 一、服务器环境准备

### 1. 连接到 ECS 服务器
```bash
ssh root@your-server-ip
# 或使用密钥文件
ssh -i your-key.pem root@your-server-ip
```

### 2. 安装 Node.js（如果未安装）
```bash
# 使用 NodeSource 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v  # 应该显示 v20.x.x 或更高
npm -v
```

### 3. 安装 MySQL（如果未安装）
```bash
# 安装 MySQL
sudo apt update
sudo apt install mysql-server -y

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置（设置 root 密码）
sudo mysql_secure_installation
```

### 4. 安装 Nginx（用于反向代理）
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. 安装 PM2（进程管理）
```bash
sudo npm install -g pm2
```

## 二、数据库配置

### 1. 创建数据库和用户
```bash
# 登录 MySQL
sudo mysql -u root -p

# 在 MySQL 中执行
CREATE DATABASE hospital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'hospital_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON hospital.* TO 'hospital_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. 导入数据库表结构
```bash
# 上传项目文件后，在项目目录执行
cd /path/to/hospital/server
mysql -u hospital_user -p hospital < create_test_tables.sql
```

## 三、上传项目代码

### 方法1：使用 Git（推荐）
```bash
# 在服务器上
cd /var/www  # 或其他目录
git clone your-repo-url hospital
cd hospital
```

### 方法2：使用 SCP
```bash
# 在本地执行
scp -r /path/to/hospital root@your-server-ip:/var/www/
```

### 方法3：使用压缩包
```bash
# 在本地打包
tar -czf hospital.tar.gz hospital/

# 上传到服务器
scp hospital.tar.gz root@your-server-ip:/var/www/

# 在服务器上解压
cd /var/www
tar -xzf hospital.tar.gz
```

## 四、配置项目

### 1. 配置后端数据库连接
编辑 `server/db.js`：
```javascript
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'hospital_user',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  database: 'hospital',
  connectionLimit: 10,
  charset: 'utf8mb4'
})
```

### 2. 配置前端 API 地址
创建 `.env.production` 文件（从 `.env.production.example` 复制）：
```bash
cp .env.production.example .env.production
```

编辑 `.env.production`，设置 API 地址：
```bash
# 使用 IP 地址
VITE_API_BASE=http://your-server-ip:3001/api

# 或使用域名（推荐）
VITE_API_BASE=https://your-domain.com/api
```

### 3. 构建前端
```bash
cd /var/www/hospital
npm install

# 如果设置了 .env.production，构建时会自动使用
npm run build

# 或者直接在构建时指定 API 地址
VITE_API_BASE=http://your-server-ip:3001/api npm run build
```

### 4. 安装后端依赖
```bash
cd /var/www/hospital/server
npm install
```

## 五、配置 PM2 启动后端服务

### 1. 创建 PM2 配置文件
创建 `server/ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'hospital-backend',
    script: './index.js',
    cwd: '/var/www/hospital/server',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_PASSWORD: 'your_secure_password'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false
  }]
}
```

### 2. 启动服务
```bash
cd /var/www/hospital/server
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 设置开机自启
```

## 六、配置 Nginx

### 1. 创建 Nginx 配置文件
创建 `/etc/nginx/sites-available/hospital`：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或使用服务器 IP

    # 前端静态文件
    root /var/www/hospital/dist;
    index index.html;

    # 前端路由（Vue Router）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 2. 启用配置
```bash
sudo ln -s /etc/nginx/sites-available/hospital /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

## 七、配置防火墙

### 1. 开放端口
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 阿里云安全组配置
在阿里云控制台：
1. 进入 ECS 实例
2. 点击"安全组"
3. 添加入站规则：
   - 端口 80（HTTP）
   - 端口 443（HTTPS，如果使用 SSL）
   - 端口 22（SSH）

## 八、SSL 证书配置（可选，推荐）

### 使用 Let's Encrypt 免费证书
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 九、验证部署

### 1. 检查服务状态
```bash
# 检查 PM2
pm2 status
pm2 logs hospital-backend

# 检查 Nginx
sudo systemctl status nginx

# 检查 MySQL
sudo systemctl status mysql
```

### 2. 测试 API
```bash
curl http://localhost:3001/api/health
```

### 3. 访问前端
在浏览器中访问：`http://your-server-ip` 或 `http://your-domain.com`

## 十、常用维护命令

```bash
# 查看后端日志
pm2 logs hospital-backend

# 重启后端
pm2 restart hospital-backend

# 停止后端
pm2 stop hospital-backend

# 重新构建前端
cd /var/www/hospital
npm run build
sudo systemctl reload nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## 十一、故障排查

### 1. 后端无法启动
- 检查数据库连接配置
- 检查端口 3001 是否被占用：`lsof -i :3001`
- 查看 PM2 日志：`pm2 logs hospital-backend`

### 2. 前端无法访问
- 检查 Nginx 配置：`sudo nginx -t`
- 检查前端文件是否存在：`ls -la /var/www/hospital/dist`
- 检查 Nginx 日志

### 3. API 请求失败
- 检查后端服务是否运行：`pm2 status`
- 检查 Nginx 代理配置
- 检查防火墙和安全组设置

## 十二、更新部署

```bash
# 1. 拉取最新代码（如果使用 Git）
cd /var/www/hospital
git pull

# 2. 重新构建前端
npm install
npm run build

# 3. 更新后端依赖（如果需要）
cd server
npm install

# 4. 重启后端
pm2 restart hospital-backend

# 5. 重载 Nginx
sudo systemctl reload nginx
```

