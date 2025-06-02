const express = require('express');
const router = express.Router();
const db = require('./index.js');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Настройка multer для сохранения файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Получить все папки пользователя
router.get('/api/folders', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    try {
        const [folders] = await db.query('SELECT * FROM folders WHERE owner_id = ?', [req.user.id]);
        res.json({ success: true, folders });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Создать новую папку
router.post('/api/folders', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Имя папки обязательно' });
    try {
        const [result] = await db.query(
            'INSERT INTO folders (name, owner_id) VALUES (?, ?)',
            [name, req.user.id]
        );
        res.json({ success: true, folderId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Получить файлы в папке
router.get('/api/folders/:folderId/files', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    const { folderId } = req.params;
    try {
        // Проверяем, что папка принадлежит пользователю
        const [folderCheck] = await db.query(
            'SELECT id FROM folders WHERE id = ? AND owner_id = ?',
            [folderId, req.user.id]
        );

        if (folderCheck.length === 0) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }

        // Получаем файлы из таблицы folder_files
        const [files] = await db.query(
            'SELECT * FROM folder_files WHERE folder_id = ? AND user_email = ?',
            [folderId, req.user.email]
        );
        res.json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Загрузить новый файл в папку
router.post('/api/folders/:folderId/upload', upload.single('file'), async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    const { folderId } = req.params;
    if (!req.file) return res.status(400).json({ success: false, error: 'Файл не загружен' });

    try {
        // Проверяем, что папка принадлежит пользователю
        const [folderCheck] = await db.query(
            'SELECT id FROM folders WHERE id = ? AND owner_id = ?',
            [folderId, req.user.id]
        );

        if (folderCheck.length === 0) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }

        // Генерируем уникальный file_id для файла в папке
        const fileId = Date.now() + '-' + Math.round(Math.random() * 1E9);

        // Добавляем файл только в таблицу folder_files
        await db.query(
            'INSERT INTO folder_files (folder_id, file_id, file_name, file_path, original_name, mime_type, file_size, user_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [folderId, fileId, req.file.originalname, req.file.path, req.file.originalname, req.file.mimetype, req.file.size, req.user.email]
        );

        res.json({ success: true, fileId: fileId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Скачать/открыть файл из папки
router.get('/api/folders/files/:fileId', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    const { fileId } = req.params;

    try {
        // Получаем информацию о файле из folder_files
        const [files] = await db.query(
            'SELECT * FROM folder_files WHERE id = ? AND user_email = ?',
            [fileId, req.user.email]
        );

        if (files.length === 0) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }

        const file = files[0];
        const filePath = path.resolve(file.file_path);

        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: 'Файл не найден на диске' });
        }

        // Устанавливаем заголовки для скачивания
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');

        // Отправляем файл
        res.sendFile(filePath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Удалить папку
router.delete('/api/folders/:folderId', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    const { folderId } = req.params;
    try {
        // Проверяем права доступа
        const [folderCheck] = await db.query(
            'SELECT id FROM folders WHERE id = ? AND owner_id = ?',
            [folderId, req.user.id]
        );

        if (folderCheck.length === 0) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }

        // Получаем все файлы в папке для их удаления с диска
        const [files] = await db.query(
            'SELECT file_path FROM folder_files WHERE folder_id = ?',
            [folderId]
        );

        // Удаляем файлы с диска
        files.forEach(file => {
            const filePath = path.resolve(file.file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        // Удаляем папку (связанные записи в folder_files удалятся автоматически благодаря ON DELETE CASCADE)
        await db.query('DELETE FROM folders WHERE id = ? AND owner_id = ?', [folderId, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Удалить файл из папки
router.delete('/api/folders/:folderId/files/:fileId', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    const { folderId, fileId } = req.params;

    try {
        // Проверяем права доступа к папке
        const [folderCheck] = await db.query(
            'SELECT id FROM folders WHERE id = ? AND owner_id = ?',
            [folderId, req.user.id]
        );

        if (folderCheck.length === 0) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }

        // Получаем путь к файлу перед удалением
        const [files] = await db.query(
            'SELECT file_path FROM folder_files WHERE id = ? AND folder_id = ? AND user_email = ?',
            [fileId, folderId, req.user.email]
        );

        if (files.length > 0) {
            // Удаляем файл с диска
            const filePath = path.resolve(files[0].file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Удаляем запись из базы данных
        await db.query(
            'DELETE FROM folder_files WHERE id = ? AND folder_id = ? AND user_email = ?',
            [fileId, folderId, req.user.email]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;