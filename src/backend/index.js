const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'RHyAkEC9rY',
    database: 'cloud',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Перевірка підключення
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Успішне підключення до бази даних!');
        connection.release();
        return true;
    } catch (err) {
        console.error('Помилка підключення до бази даних:', err);
        return false;
    }
}

// Виконуємо перевірку підключення при старті
testConnection();

module.exports = pool;