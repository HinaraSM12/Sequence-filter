// api/db.js
const mysql = require('mysql2/promise');

const {
  DB_HOST = 'sisifo.medellin.unal.edu.co',
  DB_PORT = 3306,
  DB_DATABASE = 'prospeccionydise',
  DB_USERNAME = 'prospeccionydise',
  DB_PASSWORD = 'biomole1520',
  DB_SSL = 'false'
} = process.env;

// SSL opcional (algunos hosts lo exigen)
let ssl = undefined;
if (String(DB_SSL).toLowerCase() === 'true') {
  ssl = { rejectUnauthorized: false }; // relaja validación (ajústalo si tienes CA)
}

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  connectionLimit: 10,
  waitForConnections: true,
  connectTimeout: 20000,     // 20s por si hay latencia al host remoto
  ssl                        // solo si DB_SSL=true
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { query, pool };
