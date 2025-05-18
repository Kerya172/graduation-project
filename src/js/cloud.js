// Data structure to store folders and their files
const foldersData = {};
const filesData = {};

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

function show(state) {
  document.getElementById('modalForm').style.display = state;
  document.getElementById('filter').style.display = state;
}

function toggleDropdown() {
  const dropdown = document.getElementById("dropdownMenu");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function addFolder() {
  const folderName = prompt("Введите имя папки:");
  if (folderName) {
    const folderId = 'folder_' + Date.now();

    foldersData[folderId] = {
      id: folderId,
      name: folderName,
      files: [],
      type: 'folder',
      modified: new Date().toLocaleString()
    };

    saveData();
    updateAllFilesTable();
  }
}

function openFolderModal(folderId) {
  const folder = foldersData[folderId];
  if (!folder) return;

  const modal = document.getElementById("folderModal");
  const folderTitle = document.getElementById("folderModalTitle");
  const folderNameInput = document.getElementById("folderNameInput");
  const folderFilesList = document.getElementById("folderFilesList");

  // Set current folder
  currentFolderId = folderId;

  // Update modal content
  folderTitle.textContent = folder.name;
  folderNameInput.value = folder.name;

  // Clear and populate files list
  folderFilesList.innerHTML = '';

  if (folder.files && folder.files.length > 0) {
    folder.files.forEach((fileId, index) => {
      const file = filesData[fileId];
      if (!file) return;

      const fileItem = document.createElement("div");
      fileItem.className = "folder-file-item";
      fileItem.innerHTML = `
        <span onclick="openFile('${fileId}')" style="cursor: pointer;">${file.name}</span>
        <button onclick="deleteFileFromFolder('${folderId}', '${fileId}', event)" class="file-delete-btn">×</button>
      `;
      folderFilesList.appendChild(fileItem);
    });
  }

  // Show modal
  modal.style.display = "block";
  document.getElementById("filter").style.display = "block";
}

function closeFolderModal() {
  document.getElementById("folderModal").style.display = "none";
  document.getElementById("filter").style.display = "none";
  currentFolderId = null;
}

function updateFolderName() {
  const folderNameInput = document.getElementById("folderNameInput");
  const newName = folderNameInput.value.trim();

  if (newName && currentFolderId && foldersData[currentFolderId]) {
    foldersData[currentFolderId].name = newName;
    foldersData[currentFolderId].modified = new Date().toLocaleString();

    saveData();
    updateAllFilesTable();
    closeFolderModal();
  }
}

function deleteCurrentFolder() {
  if (currentFolderId && confirm(`Вы уверены, что хотите удалить папку "${foldersData[currentFolderId].name}"?`)) {
    // Удаляем все файлы из этой папки
    if (foldersData[currentFolderId].files) {
      foldersData[currentFolderId].files.forEach(fileId => {
        delete filesData[fileId];
      });
    }

    // Удаляем саму папку
    delete foldersData[currentFolderId];

    saveData();
    updateAllFilesTable();
    closeFolderModal();
  }
}

function addFileToFolder() {
  const fileInput = document.getElementById("folder-file-input");
  const files = fileInput.files;

  if (files.length > 0 && currentFolderId && foldersData[currentFolderId]) {
    // Проверка на размер файлов
    const maxSize = 1024 * 1024 * 1024; // 50MB
    for (let file of files) {
      if (file.size > maxSize) {
        alert(`Файл ${file.name} слишком большой (${(file.size/1024/1024).toFixed(2)}MB). Максимальный размер: 50MB`);
        return;
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = 'file_' + Date.now() + '_' + i;

      // Читаем содержимое файла
      const reader = new FileReader();
      reader.onload = function(e) {
        filesData[fileId] = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream', // Дефолтный тип для неизвестных файлов
          modified: new Date().toLocaleString(),
          content: e.target.result,
          parentFolder: currentFolderId
        };

        // Добавляем файл в папку
        foldersData[currentFolderId].files.push(fileId);
        foldersData[currentFolderId].modified = new Date().toLocaleString();

        saveData();
        updateAllFilesTable();
        openFolderModal(currentFolderId);
      };
      reader.onerror = function() {
        alert(`Ошибка при чтении файла ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }
}

function deleteFileFromFolder(folderId, fileId, event) {
  event.stopPropagation();
  if (confirm(`Удалить файл "${filesData[fileId]?.name}"?`)) {
    // Удаляем файл из папки
    const folder = foldersData[folderId];
    if (folder && folder.files) {
      folder.files = folder.files.filter(id => id !== fileId);
      folder.modified = new Date().toLocaleString();
    }

    // Удаляем сам файл
    delete filesData[fileId];

    saveData();
    updateAllFilesTable();
    openFolderModal(folderId);
  }
}

function addRealFile() {
  const fileInput = document.getElementById("file-input");
  const files = fileInput.files;

  if (files.length > 0) {
    // Проверка на размер файлов
    const maxSize = 50 * 1024 * 1024; // 50MB
    for (let file of files) {
      if (file.size > maxSize) {
        alert(`Файл ${file.name} слишком большой (${(file.size/1024/1024).toFixed(2)}MB). Максимальный размер: 50MB`);
        return;
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = 'file_' + Date.now() + '_' + i;

      // Читаем содержимое файла
      const reader = new FileReader();
      reader.onload = function(e) {
        filesData[fileId] = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream', // Дефолтный тип для неизвестных файлов
          modified: new Date().toLocaleString(),
          content: e.target.result
        };

        saveData();
        updateAllFilesTable();
      };
      reader.onerror = function() {
        alert(`Ошибка при чтении файла ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }
}

function saveData() {
  localStorage.setItem('foldersData', JSON.stringify(foldersData));
  localStorage.setItem('filesData', JSON.stringify(filesData));
}

function loadData() {
  const savedFolders = localStorage.getItem('foldersData');
  const savedFiles = localStorage.getItem('filesData');

  if (savedFolders) {
    Object.assign(foldersData, JSON.parse(savedFolders));
  }

  if (savedFiles) {
    Object.assign(filesData, JSON.parse(savedFiles));
  }

  updateAllFilesTable();
}

function updateAllFilesTable() {
  const tableBody = document.getElementById('all-files-table');
  tableBody.innerHTML = '';

  // Сначала добавляем папки
  for (const folderId in foldersData) {
    const folder = foldersData[folderId];

    const row = document.createElement('tr');
    row.innerHTML = `
      <td onclick="openFolderModal('${folderId}')" style="cursor: pointer;">
        <img class="icon" src="https://img.icons8.com/color/24/000000/folder-invoices.png">
        ${folder.name}
      </td>
      <td><span class="star" onclick="toggleStar(this)">☆</span></td>
      <td>Только вы</td>
      <td>${folder.modified || '--'}</td>
    `;
    tableBody.appendChild(row);
  }

  // Затем добавляем файлы без папок
  for (const fileId in filesData) {
    const file = filesData[fileId];

    // Пропускаем файлы, которые уже в папках
    if (file.parentFolder) continue;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td onclick="openFile('${fileId}')" style="cursor: pointer;">
        <img class="icon" src="${getFileIcon(file)}">
        ${file.name}
      </td>
      <td><span class="star" onclick="toggleStar(this)">☆</span></td>
      <td>Только вы</td>
      <td>${file.modified || '--'}</td>
      <td><button onclick="deleteFile('${fileId}', event)" class="delete-file-btn">Удалить</button></td>
    `;
    tableBody.appendChild(row);
  }
}

function getFileIcon(file) {
  if (!file.type) return 'https://img.icons8.com/color/24/000000/file.png';

  const type = file.type.toLowerCase();

  if (type.includes('image')) return 'https://img.icons8.com/color/24/000000/image-file.png';
  if (type.includes('pdf')) return 'https://img.icons8.com/color/24/000000/pdf.png';
  if (type.includes('word')) return 'https://img.icons8.com/color/24/000000/word.png';
  if (type.includes('excel')) return 'https://img.icons8.com/color/24/000000/excel.png';
  if (type.includes('powerpoint')) return 'https://img.icons8.com/color/24/000000/powerpoint.png';
  if (type.includes('zip') || type.includes('compressed') || type.includes('rar') || type.includes('7z') || type.includes('tar') || type.includes('gzip'))
    return 'https://img.icons8.com/color/24/000000/zip.png';
  if (type.includes('text') || type.includes('plain')) return 'https://img.icons8.com/color/24/000000/txt.png';
  if (type.includes('audio')) return 'https://img.icons8.com/color/24/000000/audio-file.png';
  if (type.includes('video')) return 'https://img.icons8.com/color/24/000000/video-file.png';
  if (type.includes('javascript')) return 'https://img.icons8.com/color/24/000000/javascript.png';
  if (type.includes('json')) return 'https://img.icons8.com/color/24/000000/json.png';
  if (type.includes('html')) return 'https://img.icons8.com/color/24/000000/html-file.png';
  if (type.includes('css')) return 'https://img.icons8.com/color/24/000000/css-file.png';

  return 'https://img.icons8.com/color/24/000000/file.png';
}

function openFile(fileId) {
  const file = filesData[fileId];
  if (!file) return;

  // Для изображений, PDF и текстовых файлов открываем в новой вкладке
  if (file.type.includes('image') || file.type.includes('pdf') || file.type.includes('text')) {
    window.open(file.content, '_blank');
  }
  // Для других типов файлов предлагаем скачать
  else {
    const a = document.createElement('a');
    a.href = file.content;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

function deleteFile(fileId, event) {
  event.stopPropagation();
  const file = filesData[fileId];
  if (!file) return;

  if (confirm(`Удалить файл "${file.name}"?`)) {
    // Если файл в папке, удаляем его из папки
    if (file.parentFolder) {
      const folder = foldersData[file.parentFolder];
      if (folder && folder.files) {
        folder.files = folder.files.filter(id => id !== fileId);
        folder.modified = new Date().toLocaleString();
      }
    }

    // Удаляем сам файл
    delete filesData[fileId];

    saveData();
    updateAllFilesTable();

    // Если открыто модальное окно папки, обновляем его
    if (currentFolderId) {
      openFolderModal(currentFolderId);
    }
  }
}

let currentFolderId = null;

function sendInvite(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const text = document.getElementById("text").value;
  alert(`Приглашение отправлено на ${email}\nКомментарий: ${text}`);
  show('none');
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function toggleStar(element) {
  element.textContent = element.textContent === '☆' ? '★' : '☆';
  element.style.color = element.textContent === '★' ? 'gold' : 'inherit';
}

window.addEventListener('DOMContentLoaded', () => {
  // Load theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }

  // Load profile
  const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
  if (profile.username) document.getElementById('username').innerText = profile.username;
  if (profile.bio) document.getElementById('bio').innerText = profile.bio;
  if (profile.avatar) document.getElementById('avatar').src = profile.avatar;

  // Load data
  loadData();
});

// Avatar upload handler
document.getElementById('avatar-upload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const dataUrl = event.target.result;
    document.getElementById('avatar').src = dataUrl;

    // Save to localStorage
    const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
    profile.avatar = dataUrl;
    localStorage.setItem('userProfile', JSON.stringify(profile));
  };
  reader.readAsDataURL(file);
});

// Click avatar to upload
document.getElementById('avatar').addEventListener('click', function () {
  document.getElementById('avatar-upload').click();
});

// Закрытие модальных окон при клике вне их
window.addEventListener('click', function(event) {
  if (event.target === document.getElementById('filter')) {
    show('none');
    closeFolderModal();
  }
});

// Обработчик загрузки целой папки
document.getElementById('folder-upload').addEventListener('change', function(e) {
  const files = e.target.files;
  if (!files.length) return;

  // Получаем имя папки из первого файла
  const folderPath = files[0].webkitRelativePath.split('/')[0];
  const folderName = prompt("Введите имя для новой папки:", folderPath);

  if (!folderName) return;

  const folderId = 'folder_' + Date.now();

  // Создаем папку
  foldersData[folderId] = {
    id: folderId,
    name: folderName,
    files: [],
    type: 'folder',
    modified: new Date().toLocaleString()
  };

  // Проверка на размер файлов
  const maxSize = 50 * 1024 * 1024; // 50MB
  let hasLargeFiles = false;

  for (let file of files) {
    if (file.size > maxSize) {
      hasLargeFiles = true;
      break;
    }
  }

  if (hasLargeFiles) {
    if (!confirm('Некоторые файлы превышают 50MB. Продолжить загрузку (большие файлы будут пропущены)?')) {
      return;
    }
  }

  // Добавляем файлы в папку
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Пропускаем большие файлы
    if (file.size > maxSize) continue;

    const fileId = 'file_' + Date.now() + '_' + i;

    const reader = new FileReader();
    reader.onload = function(e) {
      filesData[fileId] = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        modified: new Date().toLocaleString(),
        content: e.target.result,
        parentFolder: folderId
      };

      foldersData[folderId].files.push(fileId);
      foldersData[folderId].modified = new Date().toLocaleString();

      saveData();
      updateAllFilesTable();
    };
    reader.onerror = function() {
      alert(`Ошибка при чтении файла ${file.name}`);
    };
    reader.readAsDataURL(file);
  }
});


const dropArea = document.getElementById('drop-area');

// Предотвращаем поведение по умолчанию (например, открытие файла в браузере)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => e.preventDefault(), false);
  dropArea.addEventListener(eventName, (e) => e.stopPropagation(), false);
});

// Подсветка области при перетаскивании
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => {
    dropArea.classList.add('highlight');
  }, false);
});
['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => {
    dropArea.classList.remove('highlight');
  }, false);
});

// Обработка сброшенных файлов
dropArea.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleDropFiles(files);
});

function handleDropFiles(files) {
  // Проверка на размер файлов
  const maxSize = 50 * 1024 * 1024; // 50MB
  let hasLargeFiles = false;

  for (let file of files) {
    if (file.size > maxSize) {
      hasLargeFiles = true;
      break;
    }
  }

  if (hasLargeFiles) {
    if (!confirm('Некоторые файлы превышают 50MB. Продолжить загрузку (большие файлы будут пропущены)?')) {
      return;
    }
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Пропускаем большие файлы
    if (file.size > maxSize) continue;

    const fileId = 'file_' + Date.now() + '_' + i;

    const reader = new FileReader();
    reader.onload = function (e) {
      filesData[fileId] = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        modified: new Date().toLocaleString(),
        content: e.target.result
      };

      saveData();
      updateAllFilesTable();
    };
    reader.onerror = function() {
      alert(`Ошибка при чтении файла ${file.name}`);
    };
    reader.readAsDataURL(file);
  }
}

