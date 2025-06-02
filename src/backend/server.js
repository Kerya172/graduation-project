const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./index');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const foldersRouter = require('./folders.js');

const app = express();

// Настройка CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Статические файлы - указываем правильный путь к папке с HTML
app.use(express.static(path.join(__dirname, '../html')));
app.use('/style', express.static(path.join(__dirname, '../style')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/media', express.static(path.join(__dirname, '../media')));
app.use('/backend', express.static(path.join(__dirname)));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware для получения пользователя из заголовка X-User
const getUserFromSession = async (req, res, next) => {
    const userJson = req.headers['x-user'];
    if (userJson) {
        try {
            const userData = JSON.parse(userJson);
            const [users] = await db.query('SELECT id, name, email, role FROM users WHERE email = ?', [userData.email]);
            if (users.length > 0) {
                req.user = users[0];
            }
        } catch (err) {
            console.error('Ошибка получения пользователя:', err);
            return res.status(400).json({ success: false, error: 'Некорректный заголовок X-User' });
        }
    }
    next();
};

app.use(getUserFromSession);
app.use(foldersRouter);

// Страницы - правильные пути к HTML файлам
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../html/index.html')));
app.get('/cloud.html', (req, res) => res.sendFile(path.join(__dirname, '../html/cloud.html')));
app.get('/information.html', (req, res) => res.sendFile(path.join(__dirname, '../html/information.html')));
app.get('/contact.html', (req, res) => res.sendFile(path.join(__dirname, '../html/contact.html')));
app.get('/setting.html', (req, res) => res.sendFile(path.join(__dirname, '../html/setting.html')));

// Регистрация
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hash, 'user']
        );
        res.json({ success: true, message: 'Пользователь зарегистрирован!' });
    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Вход
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Пользователь не найден' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, error: 'Неверный пароль' });
        }
        res.json({
            success: true,
            message: 'Успешный вход!',
            user: { name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============ ДОКУМЕНТЫ (ЕДИНЫЕ МАРШРУТЫ) ============

// Получение файлов пользователя
app.get('/api/documents', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }
    try {
        const [files] = await db.query('SELECT * FROM documents WHERE user_id = ?', [req.user.id]);
        res.json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Загрузка файла
app.post('/api/documents', upload.single('file'), async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Файл не найден' });
    }
    try {
        const { originalname, buffer, mimetype } = req.file;
        const [result] = await db.query(
            'INSERT INTO documents (name, data, mime_type, user_id) VALUES (?, ?, ?, ?)',
            [originalname, buffer, mimetype, req.user.id]
        );
        res.json({ success: true, fileId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/documents/:id', async (req, res) => {
    try {
        const fileId = req.params.id;

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Необходима авторизация'
            });
        }

        console.log('=== ДЕТАЛЬНАЯ ДИАГНОСТИКА ===');
        console.log('ID файла:', fileId);
        console.log('Пользователь:', req.user.id);

        // Найти файл в БД (используем db вместо connection)
        const [files] = await db.query(
            'SELECT * FROM documents WHERE id = ? AND user_id = ?',
            [fileId, req.user.id]
        );

        if (files.length === 0) {
            console.log('Файл не найден в БД');
            return res.status(404).json({
                success: false,
                error: 'Файл не найден в базе данных'
            });
        }

        const file = files[0];
        console.log('Данные файла из БД:', { id: file.id, name: file.name, mime_type: file.mime_type });

        // Проверяем, есть ли данные файла в БД (BLOB)
        if (!file.data) {
            console.log('Данные файла отсутствуют в БД');
            return res.status(404).json({
                success: false,
                error: 'Данные файла не найдены'
            });
        }

        console.log('Размер данных файла:', file.data.length);

        // Отправляем файл из БД
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
        res.send(file.data);

    } catch (error) {
        console.error('Ошибка при получении файла:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера: ' + error.message
        });
    }
});

// Скачивание файла
app.get('/api/documents/:id/download', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }
    try {
        const [files] = await db.query(
            'SELECT * FROM documents WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (!files.length) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }
        const file = files[0];
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.send(file.data);
    } catch (err) {
        console.error('Ошибка при скачивании файла:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удаление файла
app.delete('/api/documents/:id', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }
    try {
        const [result] = await db.query(
            'DELETE FROM documents WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============ ОБЩИЕ ПАПКИ ============

// Создание общей папки
app.post('/api/shared-folders', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }

    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, error: 'Название папки обязательно' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO shared_folders (name, owner_email) VALUES (?, ?)',
            [name, req.user.email]
        );

        const folder = {
            id: result.insertId,
            name,
            owner: req.user.email
        };

        res.json({ success: true, folder });
    } catch (err) {
        console.error('Ошибка при создании папки:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получение списка общих папок
app.get('/api/shared-folders', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }

    try {
        // Получаем папки, которыми владеет пользователь
        const [ownedFolders] = await db.query(
            'SELECT * FROM shared_folders WHERE owner_email = ?',
            [req.user.email]
        );

        // Получаем папки, в которые пользователь приглашен
        const [invitedFolders] = await db.query(
            `SELECT sf.*
             FROM shared_folders sf
                      JOIN shared_folder_users sfu ON sf.id = sfu.folder_id
             WHERE sfu.user_email = ?`,
            [req.user.email]
        );

        const folders = [...ownedFolders, ...invitedFolders];

        console.log("Папки из базы данных:", folders);
        res.json({ success: true, folders });
    } catch (err) {
        console.error('Ошибка при загрузке папок:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Приглашение пользователя в общую папку
app.post('/api/shared-folders/:id/invite', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Необходима авторизация' });
    }

    const folderId = req.params.id;
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email обязателен' });
    }

    try {
        // Проверяем, существует ли папка
        const folder = await findFolderById(folderId);
        if (!folder) {
            return res.status(404).json({ success: false, error: 'Папка не найдена' });
        }

        // Проверяем, является ли текущий пользователь владельцем папки
        if (folder.owner_email !== req.user.email) {
            return res.status(403).json({ success: false, error: 'Вы не являетесь владельцем папки' });
        }

        // Проверяем на существующее приглашение
        const [existing] = await db.query(
            'SELECT * FROM shared_folder_users WHERE folder_id = ? AND user_email = ?',
            [folderId, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Пользователь уже приглашен' });
        }

        // Добавляем пользователя в таблицу приглашений
        await db.query(
            'INSERT INTO shared_folder_users (folder_id, user_email) VALUES (?, ?)',
            [folderId, email]
        );

        res.json({ success: true, message: `Пользователь ${email} приглашен в папку!` });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, error: 'Пользователь уже приглашен' });
        }
        console.error('Ошибка при приглашении пользователя:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получение файлов из общей папки
app.get('/api/shared-folders/:folderId/files', async (req, res) => {
    const folderId = req.params.folderId;

    try {
        // Проверяем, существует ли папка
        const folder = await findFolderById(folderId);
        if (!folder) {
            return res.status(404).json({ success: false, error: 'Папка не найдена' });
        }

        // Получаем файлы из базы данных
        const [files] = await db.query(
            'SELECT id, name, mime_type, uploaded_at FROM shared_folder_files WHERE folder_id = ?',
            [folderId]
        );

        res.json({ success: true, files: files || [] });
    } catch (err) {
        console.error('Ошибка при получении файлов:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Загрузка файла в общую папку
app.post('/api/shared-folders/:folderId/files', upload.single('file'), async (req, res) => {
    const folderId = req.params.folderId;

    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Файл не найден' });
    }

    try {
        // Проверяем, существует ли папка
        const folder = await findFolderById(folderId);
        if (!folder) {
            return res.status(404).json({ success: false, error: 'Папка не найдена' });
        }

        // Сохраняем файл в базу данных
        const { originalname, buffer, mimetype } = req.file;
        await db.query(
            'INSERT INTO shared_folder_files (folder_id, name, data, mime_type) VALUES (?, ?, ?, ?)',
            [folderId, originalname, buffer, mimetype]
        );

        res.json({ success: true, message: 'Файл успешно загружен!' });
    } catch (err) {
        console.error('Ошибка при загрузке файла:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удаление файла из общей папки
app.delete('/api/shared-folders/:folderId/files/:fileId', async (req, res) => {
    const { folderId, fileId } = req.params;

    try {
        const folder = await findFolderById(folderId);
        if (!folder) {
            return res.status(404).json({ error: 'Папка не найдена' });
        }

        const [result] = await db.query('DELETE FROM shared_folder_files WHERE id = ? AND folder_id = ?', [fileId, folderId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        res.json({ success: true, message: 'Файл успешно удален!' });
    } catch (err) {
        console.error('Ошибка при удалении файла:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удаление общей папки
app.delete('/api/shared-folders/:folderId', async (req, res) => {
    const { folderId } = req.params;

    try {
        // Проверяем, существует ли папка
        const folder = await findFolderById(folderId);
        if (!folder) {
            console.error(`Папка с ID ${folderId} не найдена.`);
            return res.status(404).json({ success: false, error: 'Папка не найдена' });
        }

        // Удаляем все записи из таблицы shared_folder_users, связанные с папкой
        const [userDeletionResult] = await db.query('DELETE FROM shared_folder_users WHERE folder_id = ?', [folderId]);
        console.log(`Удалено пользователей: ${userDeletionResult.affectedRows}`);

        // Удаляем все файлы, связанные с папкой
        const [fileDeletionResult] = await db.query('DELETE FROM shared_folder_files WHERE folder_id = ?', [folderId]);
        console.log(`Удалено файлов: ${fileDeletionResult.affectedRows}`);

        // Удаляем саму папку
        const [folderDeletionResult] = await db.query('DELETE FROM shared_folders WHERE id = ?', [folderId]);
        if (folderDeletionResult.affectedRows === 0) {
            console.error(`Не удалось удалить папку с ID ${folderId}.`);
            return res.status(404).json({ success: false, error: 'Папка не найдена' });
        }

        res.json({ success: true, message: 'Папка успешно удалена!' });
    } catch (err) {
        console.error('Ошибка при удалении папки:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

async function findFolderById(folderId) {
    const [folders] = await db.query('SELECT * FROM shared_folders WHERE id = ?', [folderId]);
    return folders.length > 0 ? folders[0] : null;
}

async function findFileById(fileId) {
    const [files] = await db.query('SELECT * FROM documents WHERE id = ?', [fileId]);
    return files.length > 0 ? files[0] : null;
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Корневая директория: ${path.join(__dirname, '../html')}`);
});
// Добавьте эти эндпоинты в ваш server.js

// Получение файла из общей папки
app.get('/api/shared-folder-files/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: 'Необходима авторизация' });
        }

        // Проверяем, что файл существует в shared_folder_files
        const [files] = await db.query(
            'SELECT sf.*, s.owner_email FROM shared_folder_files sf ' +
            'JOIN shared_folders s ON sf.folder_id = s.id ' +
            'WHERE sf.id = ?',
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const file = files[0];

        // Проверяем права доступа (владелец папки или приглашенный пользователь)
        if (file.owner_email !== user.email) {
            const [access] = await db.query(
                'SELECT * FROM shared_folder_access WHERE folder_id = ? AND user_email = ?',
                [file.folder_id, user.email]
            );

            if (access.length === 0) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }
        }

        // Возвращаем файл
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
        res.send(file.data);

    } catch (error) {
        console.error('Ошибка при получении файла из общей папки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление файла из общей папки
app.delete('/api/shared-folder-files/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ error: 'Необходима авторизация' });
        }

        // Проверяем, что файл существует и получаем информацию о папке
        const [files] = await db.query(
            'SELECT sf.*, s.owner_email FROM shared_folder_files sf ' +
            'JOIN shared_folders s ON sf.folder_id = s.id ' +
            'WHERE sf.id = ?',
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({ error: 'Файл не найден' });
        }

        const file = files[0];

        // Проверяем права доступа (только владелец папки может удалять файлы)
        if (file.owner_email !== user.email) {
            return res.status(403).json({ error: 'Только владелец папки может удалять файлы' });
        }

        // Удаляем файл
        await db.query('DELETE FROM shared_folder_files WHERE id = ?', [fileId]);

        res.json({ success: true, message: 'Файл успешно удален' });

    } catch (error) {
        console.error('Ошибка при удалении файла из общей папки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Исправленный эндпоинт для получения файлов папки
app.get('/api/shared-folders/:folderId/files', async (req, res) => {
    const folderId = req.params.folderId;
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }

    try {
        // Проверяем доступ к папке
        const [folder] = await db.query('SELECT * FROM shared_folders WHERE id = ?', [folderId]);
        if (folder.length === 0) {
            return res.status(404).json({ error: 'Папка не найдена' });
        }

        // Проверяем права доступа
        if (folder[0].owner_email !== user.email) {
            const [access] = await db.query(
                'SELECT * FROM shared_folder_access WHERE folder_id = ? AND user_email = ?',
                [folderId, user.email]
            );

            if (access.length === 0) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }
        }

        // Получаем файлы
        const [files] = await db.query(
            'SELECT id, name, mime_type, uploaded_at FROM shared_folder_files WHERE folder_id = ?',
            [folderId]
        );

        res.json({ success: true, files });
    } catch (err) {
        console.error('Ошибка при получении файлов:', err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Загрузка файла в общую папку
app.post('/api/shared-folders/:folderId/files', upload.single('file'), async (req, res) => {
    const folderId = req.params.folderId;
    const user = req.user;

    if (!user) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    try {
        // Проверяем доступ к папке
        const [folder] = await db.query('SELECT * FROM shared_folders WHERE id = ?', [folderId]);
        if (folder.length === 0) {
            return res.status(404).json({ error: 'Папка не найдена' });
        }

        // Проверяем права доступа
        if (folder[0].owner_email !== user.email) {
            const [access] = await db.query(
                'SELECT * FROM shared_folder_access WHERE folder_id = ? AND user_email = ?',
                [folderId, user.email]
            );

            if (access.length === 0) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }
        }

        // Сохраняем файл в базу данных
        const [result] = await db.query(
            'INSERT INTO shared_folder_files (folder_id, name, data, mime_type, uploaded_at) VALUES (?, ?, ?, ?, NOW())',
            [folderId, req.file.originalname, req.file.buffer, req.file.mimetype]
        );

        res.json({
            success: true,
            message: 'Файл успешно загружен',
            fileId: result.insertId
        });

    } catch (error) {
        console.error('Ошибка при загрузке файла в общую папку:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// В файле с API документов (например, documents.js или main server file)
app.get('/api/documents', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Необходима авторизация' });

    try {
        // Получаем только файлы, которые НЕ находятся в папках (folder_id IS NULL)
        const [files] = await db.query(
            'SELECT * FROM documents WHERE user_id = ? AND (folder_id IS NULL OR folder_id = "")',
            [req.user.id]
        );

        res.json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Добавление файла в папку
app.post('/api/folders/:folderId/upload', upload.single('file'), async (req, res) => {
    try {
        const user = JSON.parse(req.headers['x-user']);
        const folderId = req.params.folderId;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'Файл не загружен' });
        }

        // Вставляем запись в folder_files
        const [result] = await db.execute(
            `INSERT INTO folder_files (folder_id, file_id, file_name, file_path, original_name, mime_type, file_size, user_email) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                folderId,
                Date.now(), // временный file_id
                file.filename,
                file.path,
                file.originalname,
                file.mimetype,
                file.size,
                user.email
            ]
        );

        res.json({ success: true, fileId: result.insertId });
    } catch (error) {
        console.error('Ошибка загрузки файла в папку:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Получение файлов папки
app.get('/api/folders/:folderId/files', async (req, res) => {
    try {
        const user = JSON.parse(req.headers['x-user']);
        const folderId = req.params.folderId;

        const [files] = await db.execute(
            `SELECT id, file_name as name, original_name, mime_type, file_size, upload_date 
             FROM folder_files 
             WHERE folder_id = ? AND user_email = ?`,
            [folderId, user.email]
        );

        res.json({ success: true, files });
    } catch (error) {
        console.error('Ошибка получения файлов папки:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Открытие файла из папки
app.get('/api/folders/files/:fileId', async (req, res) => {
    try {
        const user = JSON.parse(req.headers['x-user']);
        const fileId = req.params.fileId;

        const [files] = await db.execute(
            `SELECT file_path, original_name, mime_type 
             FROM folder_files 
             WHERE id = ? AND user_email = ?`,
            [fileId, user.email]
        );

        if (files.length === 0) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }

        const file = files[0];
        res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.sendFile(path.resolve(file.file_path));
    } catch (error) {
        console.error('Ошибка открытия файла:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Удаление файла из папки
app.delete('/api/folders/:folderId/files/:fileId', async (req, res) => {
    try {
        const user = JSON.parse(req.headers['x-user']);
        const { folderId, fileId } = req.params;

        // Получаем путь к файлу перед удалением
        const [files] = await db.execute(
            `SELECT file_path FROM folder_files 
             WHERE id = ? AND folder_id = ? AND user_email = ?`,
            [fileId, folderId, user.email]
        );

        if (files.length === 0) {
            return res.status(404).json({ success: false, error: 'Файл не найден' });
        }

        // Удаляем физический файл
        const fs = require('fs');
        if (fs.existsSync(files[0].file_path)) {
            fs.unlinkSync(files[0].file_path);
        }

        // Удаляем запись из базы данных
        await db.execute(
            `DELETE FROM folder_files WHERE id = ? AND folder_id = ? AND user_email = ?`,
            [fileId, folderId, user.email]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Ошибка удаления файла:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});