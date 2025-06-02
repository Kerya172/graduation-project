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

async function createFolder(name) {
    const user = getCurrentUser();
    if (!user) return alert('Необходимо войти в систему');
    const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User': JSON.stringify(user)
        },
        body: JSON.stringify({ name })
    });
    const data = await response.json();
    if (data.success) {
        alert('Папка створена!');
        await loadFolders();
    } else {
        alert('Ошибка создания папки: ' + (data.error || ''));
    }
}

async function addFileToFolder(folderId, fileId) {
    const user = getCurrentUser();
    if (!user) return alert('Необходимо войти в систему');
    const response = await fetch(`/api/folders/${folderId}/files`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User': JSON.stringify(user)
        },
        body: JSON.stringify({ fileId })
    });
    const data = await response.json();
    if (data.success) {
        alert('Файл доданий у папку!');
        // обновить содержимое папки
    } else {
        alert('Ошибка: ' + (data.error || ''));
    }
}

async function loadFolders() {
    const user = getCurrentUser();
    if (!user) return;
    const response = await fetch('/api/folders', {
        headers: { 'X-User': JSON.stringify(user) }
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.folders)) {
        renderFolders(data.folders);
    }
}

function renderFolders(folders) {
    const container = document.getElementById('folderList');
    if (!container) return;
    container.innerHTML = '';
    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = 'folder-item';
        div.textContent = folder.name;
        div.onclick = () => openFolder(folder.id, folder.name);

        // Кнопка удаления папки
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Видалити';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Видалити папку?')) deleteFolder(folder.id);
        };
        div.appendChild(delBtn);

        container.appendChild(div);
    });
}

async function openFolder(folderId, folderName) {
    const user = getCurrentUser();
    if (!user) return alert('Необходимо войти в систему');
    const response = await fetch(`/api/folders/${folderId}/files`, {
        headers: { 'X-User': JSON.stringify(user) }
    });
    const data = await response.json();
    if (data.success) {
        showFolderModal(folderId, folderName, data.files);
    } else {
        alert('Ошибка загрузки файлов: ' + (data.error || ''));
    }
}

function showFolderModal(folderId, folderName, files) {
    const modal = document.getElementById('folderModal');
    const body = document.getElementById('modalFolderBody');
    modal.style.display = 'block';
    body.innerHTML = `
        <h3>Вміст папки : ${folderName}</h3>
        <form id="uploadFileForm">
                <div style="margin-bottom: 15px;">

            <input type="file" id="fileInput" name="file" required>
            <button type="submit "style=" color:#ffffff;border:none; border-radius: 3px;padding:5px 10px; background:#007bff ">Завантажити файл</button>
            </div>
            <div id="fileList" style="border-top: 1px solid #ddd; padding-top: 15px; "></div>
        </form>
        <ul id="modalFileList"></ul>
    `;

    const fileList = document.getElementById('modalFileList');
    files.forEach(file => {
        const li = document.createElement('li');
        // ИСПРАВЛЕНО: используем file_name или original_name вместо file.name
        li.textContent = file.file_name || file.original_name || file.name || 'Без названия';
        li.style.cursor = 'pointer';
        li.style.cssText='color: #007bff; margin-right: 10px;'
        modalFileList.style.cssText ='display: flex; \n            justify-content: space-between; \n            align-items: center; \n            padding: 8px; \n            border: 1px solid #ddd; \n            margin: 5px 0; \n            border-radius: 3px;\n            background: #fff;'
        li.onclick = () => openFolderFile(file.id);

        // Кнопка удаления файла из папки
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️Видалити';
        delBtn.style.cssText = '' +
            'background: #dc3545;             color: white;             border: none;            padding: 5px 10px;        border-radius: 3px;           cursor: pointer;           font-size: 12px; justify-content: right;';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            removeFileFromFolder(folderId, file.id);
        };
        li.appendChild(delBtn);
        fileList.appendChild(li);
    });

    // Обработка загрузки файла
    document.getElementById('uploadFileForm').onsubmit = async function(e) {
        e.preventDefault();
        const input = document.getElementById('fileInput');
        if (!input.files.length) return;
        const formData = new FormData();
        formData.append('file', input.files[0]);
        const user = getCurrentUser();
        if (!folderId) {
            alert('Ошибка: folderId не определён');
            return;
        }
        const response = await fetch(`/api/folders/${folderId}/upload`, {
            method: 'POST',
            headers: { 'X-User': JSON.stringify(user) },
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            openFolder(folderId, folderName); // обновить список файлов
        } else {
            alert('Ошибка загрузки: ' + (data.error || ''));
        }
    };
}

// Функция для открытия файла из папки
function openFolderFile(fileId) {
    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    // Используем правильный API endpoint для файлов папок
    fetch(`/api/folders/files/${fileId}`, {
        headers: {
            'X-User': JSON.stringify(user),
            'Accept': '*/*'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        })
        .catch(error => {
            console.error('Ошибка открытия файла:', error);
            alert('Ошибка открытия файла: ' + error.message);
        });
}

window.closeFolderModal = function() {
    document.getElementById('folderModal').style.display = 'none';
}

async function deleteFolder(folderId) {
    const user = getCurrentUser();
    if (!user) return alert('Необходимо войти в систему');
    const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
        headers: { 'X-User': JSON.stringify(user) }
    });
    const data = await response.json();
    if (data.success) {
        await loadFolders();
    } else {
        alert('Ошибка удаления папки: ' + (data.error || ''));
    }
}

async function removeFileFromFolder(folderId, fileId) {
    const user = getCurrentUser();
    if (!user) return alert('Необходимо войти в систему');
    const response = await fetch(`/api/folders/${folderId}/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'X-User': JSON.stringify(user) }
    });
    const data = await response.json();
    if (data.success) {
        openFolder(folderId);
    } else {
        alert('Ошибка удаления файла: ' + (data.error || ''));
    }
}

// Пример функции для добавления файла в папку (можно доработать под ваш UI)
window.addFileToFolderPrompt = async function(folderId) {
    const fileId = prompt('Введите ID файла для добавления:');
    if (!fileId) return;
    await addFileToFolder(folderId, fileId);
    openFolder(folderId);
};

window.addFolder = async function addFolder() {
    const folderName = prompt('Введите имя новой папки:');
    if (!folderName) return;
    await createFolder(folderName);
};

// Вызовите загрузку папок при старте страницы
window.addEventListener('DOMContentLoaded', loadFolders);

// Экспортируем функции в глобальную область
window.openFolderFile = openFolderFile;
window.createFolder = createFolder;
window.loadFolders = loadFolders;