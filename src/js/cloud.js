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

// Загрузка файлов пользователя (только не в папках)
async function loadFiles() {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const response = await fetch('/api/documents', {
      headers: { 'X-User': JSON.stringify(user) }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Ошибка ответа сервера:', text);
      return [];
    }

    const data = await response.json();
    let files = [];

    if (Array.isArray(data)) {
      files = data;
    } else if (data.success && Array.isArray(data.files)) {
      files = data.files;
    } else if (Array.isArray(data.files)) {
      files = data.files;
    }

    // Фильтруем файлы: показываем только те, которые НЕ находятся в папках
    const filesNotInFolders = files.filter(file => !file.folder_id || file.folder_id === null);

    return filesNotInFolders;
  } catch (error) {
    console.error('Ошибка загрузки файлов:', error);
    return [];
  }
}

// Обновление таблицы файлов
async function updateAllFilesTable() {
  const files = await loadFiles();
  const tbody = document.getElementById('all-files-table');
  if (!tbody) return;

  tbody.innerHTML = '';
  files.forEach(file => {
    const tr = document.createElement('tr');
    tr.onclick = () => openFile(file.id);
    tr.innerHTML = `
      <td>
        <span class="material-symbols-rounded">description</span>
        ${file.name}
      </td>
      <td>
        <span class="star" onclick="toggleStar(this, event)">
          ${file.starred ? '⭐' : '☆'}
        </span>
      </td>
      <td>Только вы</td>
      <td>${file.created_at ? new Date(file.created_at).toLocaleString() : ''}</td>
      <td>
        <button onclick="deleteFile(${file.id}, event)">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Загрузка файла
async function uploadFile(file) {
  const user = getCurrentUser();
  if (!user) {
    alert('Необходимо войти в систему');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'X-User': JSON.stringify(user) },
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      await updateAllFilesTable();
      alert('Файл успешно загружен!');
    } else {
      alert('Ошибка загрузки файла: ' + (data.error || ''));
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка загрузки файла');
  }
}

// Удаление файла
async function deleteFile(fileId, event) {
  if (event) event.stopPropagation();

  const user = getCurrentUser();
  if (!user) {
    alert('Необходимо войти в систему');
    return;
  }

  if (!confirm('Удалить этот файл?')) return;

  try {
    const response = await fetch(`/api/documents/${fileId}`, {
      method: 'DELETE',
      headers: { 'X-User': JSON.stringify(user) }
    });

    const data = await response.json();
    if (data.success) {
      await updateAllFilesTable();
      alert('Файл успешно удален!');
    } else {
      alert('Ошибка удаления файла: ' + (data.error || ''));
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Ошибка удаления файла');
  }
}

async function openFile(fileId) {
    console.log('Попытка открыть файл с ID:', fileId);

    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    // Используем ту же логику, что и в openFolderFile
    fetch(`/api/documents/${fileId}`, {
        headers: {
            'X-User': JSON.stringify(user),
            'Accept': '*/*'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Получаем blob и открываем файл
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');

        // Освобождаем URL через некоторое время
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
        }, 1000);
    })
    .catch(error => {
        console.error('Ошибка открытия файла:', error);
        alert('Ошибка открытия файла: ' + error.message);
    });
}

// Скачивание файла
async function downloadFile(fileId) {
  const user = getCurrentUser();
  if (!user) {
    alert('Необходимо войти в систему');
    return;
  }

  try {
    const response = await fetch(`/api/documents/${fileId}/download`, {
      headers: { 'X-User': JSON.stringify(user) }
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // Имя файла будет взято из заголовка Content-Disposition
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } else {
      const data = await response.json();
      alert('Ошибка скачивания файла: ' + (data.error || 'Неизвестная ошибка'));
    }
  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    alert('Ошибка скачивания файла');
  }
}

// ============ ОБЩИЕ ПАПКИ ============

// Создание общей папки
async function createSharedFolder() {
    const folderName = prompt("Введите название общей папки:");
    if (!folderName) return;

    console.log("Отправка запроса на создание папки:", folderName);

    try {
        const response = await fetch('/api/shared-folders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': JSON.stringify(getCurrentUser())
            },
            body: JSON.stringify({ name: folderName })
        });

        const data = await response.json();
        console.log("Ответ от сервера:", data);

        if (data.success) {
            alert(`Общая папка "${folderName}" создана!`);
            await loadSharedFolders(); // Перезагрузка списка папок
        } else {
            alert('Ошибка создания папки: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('Ошибка при создании папки:', error);
        alert('Произошла ошибка при создании папки.');
    }
}

// Загрузка списка общих папок
async function loadSharedFolders() {
    console.log("Загрузка списка общих папок...");

    try {
        const response = await fetch('/api/shared-folders', {
            headers: { 'X-User': JSON.stringify(getCurrentUser()) }
        });

        const data = await response.json();
        console.log("Полученные данные от сервера:", data);

        if (data.success) {
            renderSharedFolders(data.folders);
        } else {
            alert('Ошибка загрузки общих папок: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('Ошибка при загрузке списка папок:', error);
        alert('Произошла ошибка при загрузке списка папок.');
    }
}

// Отображение списка общих папок
function renderSharedFolders(folders) {
    const container = document.getElementById('sharedFolderList');
    if (!container) {
        console.error('Элемент sharedFolderList не найден в DOM');
        return;
    }

    console.log("Отображаем папки:", folders);

    container.innerHTML = ''; // Очистка контейнера

    folders.forEach(folder => {
        const div = document.createElement('div');
        div.className = 'folder-item'; // Используем общий класс folder-item

        const folderName = document.createElement('span');
        folderName.textContent = folder.name;
        folderName.style.cursor = 'pointer';
        folderName.onclick = () => openSharedFolder(folder.id, folder.name);

        const inviteBtn = document.createElement('button');
        inviteBtn.textContent = 'Пригласить';
        inviteBtn.onclick = () => inviteToSharedFolder(folder.id);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Удалить';
        deleteBtn.onclick = () => deleteSharedFolder(folder.id);

        div.appendChild(folderName);
        div.appendChild(inviteBtn);
        div.appendChild(deleteBtn);
        container.appendChild(div);
    });
}

// Приглашение пользователя в общую папку
async function inviteToSharedFolder(folderId) {
    const email = prompt('Введите email пользователя для приглашения:');
    if (!email) return;

    try {
        const response = await fetch(`/api/shared-folders/${folderId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User': JSON.stringify(getCurrentUser())
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (data.success) {
            alert(`Пользователь ${email} приглашен в папку!`);
        } else {
            alert('Ошибка приглашения: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('Ошибка при приглашении пользователя:', error);
        alert('Произошла ошибка при приглашении пользователя.');
    }
}

// Открытие модального окна с содержимым папки
async function openSharedFolder(folderId, folderName) {
    const modal = document.getElementById('folderModal');
    const modalTitle = document.getElementById('modalFolderTitle');
    const modalBody = document.getElementById('modalFolderBody');

    modalTitle.textContent = `Содержимое папки: ${folderName}`;
    modalBody.innerHTML = `
        <div>
            <form id="uploadFileForm" enctype="multipart/form-data">
                <input type="file" id="fileInput" name="file" />
                <button type="button" onclick="uploadFileToFolder(${folderId})">Загрузить файл</button>
            </form>
        </div>
        <div id="fileList">Загрузка...</div>
    `;

    try {
        const response = await fetch(`/api/shared-folders/${folderId}/files`, {
            headers: { 'X-User': JSON.stringify(getCurrentUser()) }
        });

        const data = await response.json();
        if (data.success) {
            renderFolderContents(data.files);
        } else {
            document.getElementById('fileList').innerHTML = `<p>Ошибка загрузки содержимого: ${data.error || 'Неизвестная ошибка'}</p>`;
        }
    } catch (error) {
        console.error('Ошибка при загрузке содержимого папки:', error);
        document.getElementById('fileList').innerHTML = '<p>Ошибка загрузки содержимого папки.</p>';
    }

    modal.style.display = 'block';
}

// Закрытие модального окна
function closeFolderModal() {
    document.getElementById('folderModal').style.display = 'none';
    document.getElementById('folderModal').setAttribute('aria-hidden', 'true');
}

// Открытие модального окна для создания папки
function openFolderModal() {
    document.getElementById('folderModal').style.display = 'flex';
    document.getElementById('folderModal').setAttribute('aria-hidden', 'false');
}

function openSharedFolderModal() {
    document.getElementById('sharedFolderModal').style.display = 'flex';
    document.getElementById('sharedFolderModal').setAttribute('aria-hidden', 'false');
}

// Закрытие модального окна для создания папки
function closeSharedFolderModal() {
    document.getElementById('sharedFolderModal').style.display = 'none';
    document.getElementById('sharedFolderModal').setAttribute('aria-hidden', 'true');
}

// Отображение содержимого папки
function renderFolderContents(files) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Очищаем содержимое

    if (!Array.isArray(files) || files.length === 0) {
        fileList.innerHTML = '<p>Папка пуста.</p>';
        return;
    }

    files.forEach(file => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #ccc; margin: 5px 0; border-radius: 5px;';

        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        fileName.style.cursor = 'pointer';
        fileName.style.color = '#007bff';
        fileName.onclick = () => openSharedFile(file.id); // Используем специальную функцию для общих папок

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Удалить';
        deleteBtn.style.cssText = 'background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;';
        deleteBtn.onclick = () => deleteSharedFile(file.id);

        fileDiv.appendChild(fileName);
        fileDiv.appendChild(deleteBtn);
        fileList.appendChild(fileDiv);
    });
}

// ИСПРАВЛЕННАЯ функция для открытия файла из общей папки
function openSharedFile(fileId) {
    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    console.log('Открываем файл из общей папки:', fileId);

    // ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ URL для файлов из общих папок
    fetch(`/api/shared-folder-files/${fileId}`, {
        headers: {
            'X-User': JSON.stringify(user),
            'Accept': '*/*'
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Создаём URL для файла и открываем его в новой вкладке
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            // Освобождаем URL через некоторое время
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        })
        .catch(error => {
            console.error('Ошибка открытия файла:', error);
            alert('Ошибка открытия файла: ' + error.message);
        });
}

// ИСПРАВЛЕННАЯ функция для удаления файла из общей папки
async function deleteSharedFile(fileId) {
    if (!confirm('Удалить этот файл?')) return;

    const user = getCurrentUser();
    if (!user) {
        alert('Необходимо войти в систему');
        return;
    }

    try {
        // ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ URL для удаления файлов из общих папок
        const response = await fetch(`/api/shared-folder-files/${fileId}`, {
            method: 'DELETE',
            headers: { 'X-User': JSON.stringify(user) }
        });

        const data = await response.json();
        if (data.success) {
            alert('Файл успешно удален!');
            // Перезагружаем текущую папку
            location.reload();
        } else {
            alert('Ошибка удаления файла: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка удаления файла');
    }
}

// Удаление общей папки
async function deleteSharedFolder(folderId) {
    if (!confirm('Вы уверены, что хотите удалить эту папку?')) return;

    try {
        const response = await fetch(`/api/shared-folders/${folderId}`, {
            method: 'DELETE',
            headers: {
                'X-User': JSON.stringify(getCurrentUser())
            }
        });

        const data = await response.json();
        if (data.success) {
            alert('Папка успешно удалена!');
            await loadSharedFolders(); // Перезагрузка списка папок
        } else {
            alert('Ошибка удаления папки: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('Ошибка при удалении папки:', error);
        alert('Произошла ошибка при удалении папки.');
    }
}

// Загрузка файла в общую папку
async function uploadFileToFolder(folderId) {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files.length) {
        alert('Выберите файл для загрузки.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/shared-folders/${folderId}/files`, {
            method: 'POST',
            headers: {
                'X-User': JSON.stringify(getCurrentUser())
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            alert('Файл успешно загружен!');
            // Обновляем список файлов в папке
            const folderName = document.getElementById('modalFolderTitle').textContent.replace('Содержимое папки: ', '');
            await openSharedFolder(folderId, folderName);
        } else {
            alert('Ошибка загрузки файла: ' + (data.error || ''));
        }
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        alert('Ошибка загрузки файла');
    }
}

// Drag and Drop
const dropArea = document.getElementById('drop-area');
if (dropArea) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
  });
  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });
  dropArea.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function highlight() {
  if (dropArea) dropArea.classList.add('highlight');
}

function unhighlight() {
  if (dropArea) dropArea.classList.remove('highlight');
}

async function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  for (let i = 0; i < files.length; i++) {
    await uploadFile(files[i]);
  }
}

// Темная тема
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.body.classList.add('dark-theme');

  const user = getCurrentUser();
  if (user && document.getElementById('username')) {
    document.getElementById('username').innerText = user.name;
  }

  await updateAllFilesTable();
  await loadSharedFolders();
});

// Загрузка общих папок при загрузке страницы
window.addEventListener('DOMContentLoaded', loadSharedFolders);

// ============ ГЛОБАЛЬНЫЕ ФУНКЦИИ ============

window.addRealFile = function addRealFile(input) {
  if (input && input.files && input.files[0]) {
    uploadFile(input.files[0]);
    input.value = '';
  }
};

window.toggleStar = function toggleStar(element, event) {
  if (event) event.stopPropagation();
  element.textContent = element.textContent === '☆' ? '⭐' : '☆';
};

window.openFile = openFile;
window.deleteFile = deleteFile;
window.downloadFile = downloadFile;
window.toggleTheme = toggleTheme;

window.toggleSidebar = function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed');
};

window.show = function show(state) {
  const modal = document.getElementById('modalForm');
  const filter = document.getElementById('filter');
  if (modal) modal.style.display = state;
  if (filter) filter.style.display = state;
};

// Сортировка файлов
window.sortFiles = async function sortFiles(criteria, element) {
  const sortIcons = document.querySelectorAll('.sort-icon');
  sortIcons.forEach(icon => icon.classList.remove('active'));
  element.classList.add('active');

  const files = await loadFiles();
  files.sort((a, b) => {
    if (criteria === 'name') {
      return a.name.localeCompare(b.name);
    } else if (criteria === 'date') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (criteria === 'size') {
      return (a.size || 0) - (b.size || 0);
    }
  });

  renderFiles(files);
};

function renderFiles(files) {
  const tableBody = document.getElementById('all-files-table');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  files.forEach(file => {
    const tr = document.createElement('tr');
    tr.onclick = () => openFile(file.id);
    tr.innerHTML = `
      <td>
        <span class="material-symbols-rounded">description</span>
        ${file.name}
      </td>
      <td>
        <span class="star" onclick="toggleStar(this, event)">☆</span>
      </td>
      <td>Только вы</td>
      <td>${file.created_at ? new Date(file.created_at).toLocaleString() : ''}</td>
      <td>
        <button onclick="deleteFile(${file.id}, event)">×</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Dropdown меню
document.addEventListener('click', (e) => {
  if (!e.target.matches('.dropbtn')) {
    document.querySelectorAll('.dropdown-content').forEach(dc => {
      dc.style.display = 'none';
    });
  }
});

window.toggleDropdown = function toggleDropdown() {
  const dropdown = document.querySelector('.dropdown-content');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  }
};

// Экспортируем функции в глобальную область
window.createSharedFolder = createSharedFolder;
window.openSharedFile = openSharedFile;
window.deleteSharedFile = deleteSharedFile;
window.uploadFileToFolder = uploadFileToFolder;
window.closeFolderModal = closeFolderModal;