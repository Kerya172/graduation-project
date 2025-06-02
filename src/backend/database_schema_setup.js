// init-db.js
const connection = require('./db');

const createTables = () => {
    // Таблица пользователей
    connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Таблица файлов
    connection.query(`
    CREATE TABLE IF NOT EXISTS files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      size BIGINT,
      user_id INT,
      parent_folder_id INT NULL,
      content LONGBLOB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

    // Таблица папок
    connection.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      owner_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);
};

createTables();