// api/db.js
const mysql = require('mysql2/promise');

const {
  DB_HOST = 'host.docker.internal',
  DB_PORT = 3307,
  DB_DATABASE = 'prospeccionydise',
  DB_USERNAME = 'prospeccion',
  DB_PASSWORD = 'biomole1520'
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  connectionLimit: 10
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { query };
