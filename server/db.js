const mysql = require('mysql2/promise')

// 简单的连接池配置：根据你本地 MySQL 实际账号密码修改
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root', // TODO: 请改成你的实际密码，生产环境建议用环境变量
  database: 'hospital',
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


