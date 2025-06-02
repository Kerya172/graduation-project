/**
 * Модуль для работы с общими папками и файлами в них
 */

// Получение текущего пользователя из localStorage
function getCurrentUser() {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        console.error('Пользователь не найден в localStorage');
        return null;
    }

    try {
        const user = JSON.parse(userJson);
        if (!user || !user.email) {
            console.error('Некорректные данные пользователя:', user);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error);
        return null;
    }
}

// ============ УПРАВЛЕНИЕ ОБЩИМИ ПАПКАМИ ============

/**
 * Создание новой общей папки
 */
async function createSharedFolder() {
    const folderName = prompt("Введите название общей папки:");
    if (!folderName || !folderName.trim()) return;

    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    console.log("Створення папки:", folderName);

    try {
        const response = await fetch('/api/shared-folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': JSON.stringify(user)
            },
            body: JSON.stringify({ name: folderName.trim() })
        });

        const data = await response.json();
        console.log("Ответ сервера:", data);

        if (data.success) {
            alert(`Общая папка "${folderName}" успешно создана!`);
            await loadSharedFolders();
        } else {
            alert('Ошибка создания папки: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при создании папки:', error);
        alert('Произошла ошибка при создании папки.');
    }
}

/**
 * Загрузка списка общих папок текущего пользователя
 */
async function loadSharedFolders() {
    const user = getCurrentUser();
    if (!user) return;

    console.log("Загрузка общих папок...");

    try {
        const response = await fetch('/api/shared-folders', {
            headers: { 'X-User': JSON.stringify(user) }
        });

        const data = await response.json();
        console.log("Данные папок:", data);

        if (data.success && Array.isArray(data.folders)) {
            renderSharedFolders(data.folders);
        } else {
            console.error('Ошибка загрузки папок:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке папок:', error);
    }
}

/**
 * Отображение списка общих папок
 */
function renderSharedFolders(folders) {
    const container = document.getElementById('sharedFolderList');
    if (!container) {
        console.error('Контейнер sharedFolderList не найден');
        return;
    }

    container.innerHTML = '';

    if (!folders || folders.length === 0) {
        container.innerHTML = '<p>У вас пока нет общих папок</p>';
        return;
    }

    folders.forEach(folder => {
        const folderElement = document.createElement('div');
        folderElement.className = 'shared-folder-item';
        folderElement.style.cssText = `
            
        `;

        const folderName = document.createElement('span');
        folderName.textContent = folder.name;
        folderName.style.cssText = 'cursor: pointer; color: #007bff; font-weight: bold;';
        folderName.onclick = () => openSharedFolder(folder.id, folder.name);

        const buttonContainer = document.createElement('div');

        const inviteBtn = document.createElement('button');
        inviteBtn.textContent = 'Запросити';
        inviteBtn.style.cssText = 'margin-right: 5px; padding: 10px 15px; background: #35c75a; color: white; border: none; border-radius: 7px; cursor: pointer;';
        inviteBtn.onclick = () => inviteToSharedFolder(folder.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Видалити';
        deleteBtn.style.cssText = 'padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 7px; cursor: pointer;';
        deleteBtn.onclick = () => deleteSharedFolder(folder.id);

        buttonContainer.appendChild(inviteBtn);
        buttonContainer.appendChild(deleteBtn);

        folderElement.appendChild(folderName);
        folderElement.appendChild(buttonContainer);
        container.appendChild(folderElement);
    });
}

/**
 * Удаление общей папки
 */
async function deleteSharedFolder(folderId) {
    if (!confirm('Ви впевнені що хочете видалити папку? Усі файли будуть втратені.')) {
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    try {
        const response = await fetch(`/api/shared-folders/${folderId}`, {
            method: 'DELETE',
            headers: { 'X-User': JSON.stringify(user) }
        });

        const data = await response.json();
        if (data.success) {
            alert('Папка успешно удалена!');
            await loadSharedFolders();
        } else {
            alert('Ошибка удаления папки: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при удалении папки:', error);
        alert('Произошла ошибка при удалении папки.');
    }
}

/**
 * Приглашение пользователя в общую папку
 */
async function inviteToSharedFolder(folderId) {
    const email = prompt('Введіть email користувача щоб запросити:');
    if (!email || !email.trim()) return;

    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    try {
        const response = await fetch(`/api/shared-folders/${folderId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': JSON.stringify(user)
            },
            body: JSON.stringify({ email: email.trim() })
        });

        const data = await response.json();
        if (data.success) {
            alert(`Користувач ${email} успішно запрошен до папку!`);
        } else {
            alert('Ошибка приглашения: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при приглашении пользователя:', error);
        alert('Произошла ошибка при приглашении пользователя.');
    }
}

// ============ УПРАВЛЕНИЕ ФАЙЛАМИ В ОБЩИХ ПАПКАХ ============

/**
 * Открытие модального окна с содержимым общей папки
 */
async function openSharedFolder(folderId, folderName) {
    const modal = document.getElementById('folderModal');
    const modalTitle = document.getElementById('modalFolderTitle');
    const modalBody = document.getElementById('modalFolderBody');

    if (!modal || !modalTitle || !modalBody) {
        console.error('Элементы модального окна не найдены');
        return;
    }

    // Обновляем заголовок модального окна
    modalTitle.textContent = `Вміст папки: ${folderName}`;

    // Создаем форму загрузки и контейнер для файлов
    modalBody.innerHTML = `
        <div style="margin-bottom: 15px;">
            <input type="file" id="fileInput" name="file" style="margin-right: 10px;" />
            <button type="button" onclick="uploadFileToSharedFolder(${folderId})" 
                    style="padding: 5px 15px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                Завантажити файл
            </button>
        </div>
        <div id="fileList" style="border-top: 1px solid #ddd; padding-top: 15px;">
            Завантаження файлів...
        </div>
    `;

    // Показываем модальное окно
    modal.style.display = 'block';

    // Загружаем список файлов
    await loadSharedFolderFiles(folderId);
}

/**
 * Загрузка файлов из общей папки
 */
async function loadSharedFolderFiles(folderId) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const response = await fetch(`/api/shared-folders/${folderId}/files`, {
            headers: { 'X-User': JSON.stringify(user) }
        });

        const data = await response.json();
        console.log('Файлы папки:', data);

        if (data.success && Array.isArray(data.files)) {
            renderSharedFolderFiles(data.files);
        } else {
            document.getElementById('fileList').innerHTML =
                `<p style="color: red;">Ошибка загрузки: ${data.error || 'Неизвестная ошибка'}</p>`;
        }
    } catch (error) {
        console.error('Ошибка при загрузке файлов:', error);
        document.getElementById('fileList').innerHTML =
            '<p style="color: red;">Ошибка загрузки содержимого папки.</p>';
    }
}

/**
 * Отображение файлов в общей папке
 */
function renderSharedFolderFiles(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    fileList.innerHTML = '';

    if (!files || files.length === 0) {
        fileList.innerHTML = '<p style="color: #666;">Папка пуста.</p>';
        return;
    }

    files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.style.cssText = `
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 8px; 
            border: 1px solid #ddd; 
            margin: 5px 0; 
            border-radius: 3px;
            background: #fff;
        `;

        const fileInfo = document.createElement('div');
        fileInfo.style.cssText = 'display: flex; align-items: center;';

        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        fileName.style.cssText = 'cursor: pointer; color: #007bff; margin-right: 10px;';
        fileName.onclick = () => openSharedFolderFile(file.id);

        const fileDate = document.createElement('small');
        fileDate.textContent = file.uploaded_at ?
            `Загружен: ${new Date(file.uploaded_at).toLocaleString('ru-RU')}` : '';
        fileDate.style.cssText = 'color: #666;';

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileDate);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️ Видалити';
        deleteBtn.style.cssText = `
            background: #dc3545; 
            color: white; 
            border: none; 
            padding: 5px 10px; 
            border-radius: 3px; 
            cursor: pointer;
            font-size: 12px;
        `;
        deleteBtn.onclick = () => deleteSharedFolderFile(file.id);

        fileDiv.appendChild(fileInfo);
        fileDiv.appendChild(deleteBtn);
        fileList.appendChild(fileDiv);
    });
}

/**
 * Открытие файла из общей папки - ИСПРАВЛЕННАЯ ВЕРСИЯ
 */
function openSharedFolderFile(fileId) {
    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    console.log('Открываем файл из общей папки, ID:', fileId);

    // ПРАВИЛЬНЫЙ URL для файлов из общих папок
    fetch(`/api/shared-folder-files/${fileId}`, {
        headers: {
            'X-User': JSON.stringify(user),
            'Accept': '*/*'
        }
    })
        .then(response => {
            console.log('Статус ответа:', response.status);

            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            console.log('Получен blob, размер:', blob.size);

            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');

            if (!newWindow) {
                // Если браузер заблокировал всплывающее окно, предлагаем скачать
                const a = document.createElement('a');
                a.href = url;
                a.download = `file_${fileId}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            // Освобождаем URL через некоторое время
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 5000);
        })
        .catch(error => {
            console.error('Ошибка открытия файла:', error);
            alert('Ошибка открытия файла: ' + error.message);
        });
}

/**
 * Удаление файла из общей папки - ИСПРАВЛЕННАЯ ВЕРСИЯ
 */
async function deleteSharedFolderFile(fileId) {
    if (!confirm('Ви впевнені що хочете видалити файл?')) {
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    console.log('Видяляємо файл з вашої папки, ID:', fileId);

    try {
        // ПРАВИЛЬНЫЙ URL для удаления файлов из общих папок
        const response = await fetch(`/api/shared-folder-files/${fileId}`, {
            method: 'DELETE',
            headers: { 'X-User': JSON.stringify(user) }
        });

        console.log('Статус удаления:', response.status);

        const data = await response.json();
        if (data.success) {
            alert('Файл успешно удален!');
            // Перезагружаем список файлов в текущей папке
            const modalTitle = document.getElementById('modalFolderTitle');
            if (modalTitle && modalTitle.textContent.includes('Содержимое папки:')) {
                // Извлекаем ID папки из контекста или перезагружаем всю страницу
                location.reload();
            }
        } else {
            alert('Ошибка удаления файла: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        alert('Произошла ошибка при удалении файла.');
    }
}

/**
 * Загрузка файла в общую папку - ИСПРАВЛЕННАЯ ВЕРСИЯ
 */
async function uploadFileToSharedFolder(folderId) {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Выберите файл для загрузки.');
        return;
    }

    const file = fileInput.files[0];
    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    console.log('Загружаем файл в папку:', folderId, 'файл:', file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/shared-folders/${folderId}/files`, {
            method: 'POST',
            headers: {
                'X-User': JSON.stringify(user)
            },
            body: formData
        });

        const data = await response.json();
        console.log('Результат загрузки:', data);

        if (data.success) {
            alert('Файл успешно загружен!');
            // Очищаем input
            fileInput.value = '';
            // Обновляем список файлов
            await loadSharedFolderFiles(folderId);
        } else {
            alert('Ошибка загрузки файла: ' + (data.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        alert('Произошла ошибка при загрузке файла.');
    }
}

// ============ МОДАЛЬНЫЕ ОКНА ============

/**
 * Закрытие модального окна
 */
function closeFolderModal() {
    const modal = document.getElementById('folderModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============

/**
 * Загрузка общих папок при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Инициализация модуля общих папок');
    loadSharedFolders();
});

// ============ ЭКСПОРТ ФУНКЦИЙ ============

// Экспортируем все функции в глобальную область видимости
window.createSharedFolder = createSharedFolder;
window.loadSharedFolders = loadSharedFolders;
window.deleteSharedFolder = deleteSharedFolder;
window.inviteToSharedFolder = inviteToSharedFolder;
window.openSharedFolder = openSharedFolder;
window.openSharedFolderFile = openSharedFolderFile;
window.deleteSharedFolderFile = deleteSharedFolderFile;
window.uploadFileToSharedFolder = uploadFileToSharedFolder;
window.closeFolderModal = closeFolderModal;

// Сохраняем старые имена функций для совместимости
window.openSharedFile = openSharedFolderFile;
window.deleteSharedFile = deleteSharedFolderFile;
window.uploadFileToFolder = uploadFileToSharedFolder;

console.log('Модуль shared_folders.js загружен успешно');