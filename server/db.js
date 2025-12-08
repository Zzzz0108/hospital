const mysql = require('mysql2/promise')

// 数据库连接池配置
// 生产环境建议使用环境变量配置敏感信息
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'hospital_user',
  password: process.env.DB_PASSWORD || 'your_secure_password', // 生产环境必须修改
  database: process.env.DB_NAME || 'hospital',
  connectionLimit: 10,
  charset: 'utf8mb4'
})

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

module.exports = {
  pool,
  query
}


