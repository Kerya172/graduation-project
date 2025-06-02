
// ===== СИСТЕМА СИНХРОНИЗАЦИИ ПРОФИЛЯ =====

class ProfileManager {
    constructor() {
        this.storageKey = 'userProfile';
        this.defaultProfile = {
            username: 'Користувач',
            bio: 'Ваш статус',
            email: '',
            phone: '',
            country: '',
            avatar: 'https://placekitten.com/200/200',
            settings: {
                notifications: true,
                language: 'uk',
                privacy: false,
                theme: 'dark'
            },
            lastUpdated: new Date().toISOString()
        };

        this.init();
    }

    // Инициализация системы
    init() {
        this.loadProfile();
        this.setupEventListeners();
        this.updateUI();
    }

    // Загрузка профиля из localStorage
    loadProfile() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.profile = { ...this.defaultProfile, ...JSON.parse(stored) };
            } else {
                this.profile = { ...this.defaultProfile };
                this.saveProfile();
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            this.profile = { ...this.defaultProfile };
        }
    }

    // Сохранение профиля в localStorage
    saveProfile() {
        try {
            this.profile.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
            this.notifyProfileChange();
        } catch (error) {
            console.error('Ошибка сохранения профиля:', error);
        }
    }

    // Обновление данных профиля
    updateProfile(data) {
        this.profile = { ...this.profile, ...data };
        this.saveProfile();
        this.updateUI();
    }

    // Обновление настроек
    updateSettings(settings) {
        this.profile.settings = { ...this.profile.settings, ...settings };
        this.saveProfile();
        this.updateUI();
    }

    // Уведомление об изменении профиля
    notifyProfileChange() {
        // Отправляем событие для синхронизации между вкладками
        window.dispatchEvent(new CustomEvent('profileUpdated', {
            detail: this.profile
        }));
    }

    // Настройка слушателей событий
    setupEventListeners() {
        // Слушаем изменения из других вкладок
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.loadProfile();
                this.updateUI();
            }
        });

        // Слушаем собственные события
        window.addEventListener('profileUpdated', (e) => {
            this.updateUI();
        });

        // Обработка загрузки аватара
        this.setupAvatarUpload();
    }

    // Настройка загрузки аватара
    setupAvatarUpload() {
        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                this.handleAvatarUpload(e.target.files[0]);
            });
        }
    }

    // Обработка загрузки аватара
    handleAvatarUpload(file) {
        if (!file) return;

        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            this.showNotification('Будь ласка, оберіть файл зображення', 'error');
            return;
        }

        // Проверка размера файла (максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Розмір файлу не повинен перевищувати 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.updateProfile({ avatar: e.target.result });
            this.showNotification('Аватар успішно оновлено!', 'success');
        };
        reader.onerror = () => {
            this.showNotification('Помилка завантаження файлу', 'error');
        };
        reader.readAsDataURL(file);
    }

    // Обновление UI
    updateUI() {
        this.updateAvatar();
        this.updateUsername();
        this.updateProfileInfo();
        this.updateSettings();
    }

    // Обновление аватара
    updateAvatar() {
        const avatarElements = document.querySelectorAll('#avatar, .avatar');
        avatarElements.forEach(element => {
            if (element) {
                element.src = this.profile.avatar;
                element.alt = this.profile.username;
            }
        });
    }

    // Обновление имени пользователя
    updateUsername() {
        const usernameElements = document.querySelectorAll('#username');
        usernameElements.forEach(element => {
            if (element) {
                element.textContent = this.profile.username;
            }
        });
    }

    // Обновление информации профиля
    updateProfileInfo() {
        // Обновляем био
        const bioElement = document.getElementById('bio');
        if (bioElement) {
            bioElement.textContent = this.profile.bio || 'Ваш статус';
        }

        // Обновляем email
        const emailElement = document.getElementById('email');
        if (emailElement) {
            emailElement.textContent = this.profile.email || '—';
        }

        // Обновляем телефон
        const phoneElement = document.getElementById('phone');
        if (phoneElement) {
            phoneElement.textContent = this.profile.phone || '—';
        }

        // Обновляем страну
        const countryElement = document.getElementById('country');
        if (countryElement) {
            countryElement.textContent = this.profile.country || '—';
        }
    }

    // Обновление настроек
    updateSettings() {
        // Уведомления
        const notifSwitch = document.getElementById('notifSwitch');
        if (notifSwitch) {
            notifSwitch.checked = this.profile.settings.notifications;
        }

        // Язык
        const langSelect = document.getElementById('langSelect');
        if (langSelect) {
            langSelect.value = this.profile.settings.language;
        }

        // Приватность
        const privacySwitch = document.getElementById('privacySwitch');
        if (privacySwitch) {
            privacySwitch.checked = this.profile.settings.privacy;
        }

        // Тема
        this.applyTheme();
    }

    // Применение темы
    applyTheme() {
        const theme = this.profile.settings.theme;
        if (theme === 'light') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }

    // Показ уведомлений
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Добавляем стили
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff453a' : type === 'success' ? '#30d158' : '#007aff'};
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideInNotification 0.3s ease;
      backdrop-filter: blur(10px);
    `;

        // Добавляем анимацию
        const style = document.createElement('style');
        style.textContent = `
      @keyframes slideInNotification {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideInNotification 0.3s ease reverse';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }

    // Получение данных профиля
    getProfile() {
        return { ...this.profile };
    }

    // Сброс профиля
    resetProfile() {
        if (confirm('Сбросить все данные профиля?')) {
            localStorage.removeItem(this.storageKey);
            this.profile = { ...this.defaultProfile };
            this.saveProfile();
            this.updateUI();
            this.showNotification('Профіль скинуто!', 'info');

            // Перезагрузка страницы через секунду
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    // Выход из аккаунта
    logout() {
        if (confirm('Вийти з облікового запису?')) {
            localStorage.clear();
            this.showNotification('Вихід виконано!', 'info');

            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = '/html/index.html';
            }, 1000);
        }
    }
}

// Глобальные функции для использования в HTML
window.profileManager = new ProfileManager();

// Функции для редактирования полей (для setting.html)
window.editField = function(fieldName) {
    const element = document.getElementById(fieldName);
    if (!element) return;

    const currentValue = element.textContent === '—' ? '' : element.textContent;

    // Создаем инпут для редактирования
    const input = document.createElement('input');
    input.type = fieldName === 'email' ? 'email' : 'text';
    input.value = currentValue;
    input.className = 'edit-input';
    input.style.cssText = `
    background: rgba(44, 44, 46, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    width: 100%;
    margin: 5px 0;
  `;

    // Создаем кнопки
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✓';
    saveBtn.className = 'save-btn';
    saveBtn.style.cssText = `
    background: #30d158;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✗';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.style.cssText = `
    background: #ff453a;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;

    buttonsDiv.appendChild(saveBtn);
    buttonsDiv.appendChild(cancelBtn);

    // Заменяем элемент на инпут
    const parent = element.parentNode;
    const originalElement = element;
    parent.replaceChild(input, element);
    parent.appendChild(buttonsDiv);

    input.focus();
    input.select();

    // Обработчик сохранения
    const save = () => {
        const newValue = input.value.trim();
        if (newValue) {
            profileManager.updateProfile({ [fieldName]: newValue });
            profileManager.showNotification(`${fieldName} оновлено!`, 'success');
        }

        originalElement.textContent = newValue || '—';
        parent.replaceChild(originalElement, input);
        buttonsDiv.remove();
    };

    // Обработчик отмены
    const cancel = () => {
        parent.replaceChild(originalElement, input);
        buttonsDiv.remove();
    };

    // События
    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', cancel);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
    });
};

// Функция для сброса профиля
window.clearProfile = function() {
    profileManager.resetProfile();
};

// Функция для выхода
window.logout = function() {
    profileManager.logout();
};

// Функция переключения темы
window.toggleTheme = function() {
    const currentTheme = profileManager.profile.settings.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    profileManager.updateSettings({ theme: newTheme });
    profileManager.showNotification(`Тема змінена на ${newTheme === 'dark' ? 'темну' : 'світлу'}!`, 'info');
};

// Обработчики для настроек (для setting.html)
document.addEventListener('DOMContentLoaded', function() {
    // Уведомления
    const notifSwitch = document.getElementById('notifSwitch');
    if (notifSwitch) {
        notifSwitch.addEventListener('change', function() {
            profileManager.updateSettings({ notifications: this.checked });
            profileManager.showNotification('Налаштування сповіщень оновлено!', 'info');
        });
    }

    // Язык
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.addEventListener('change', function() {
            profileManager.updateSettings({ language: this.value });
            profileManager.showNotification('Мова інтерфейсу змінена!', 'info');
        });
    }

    // Приватность
    const privacySwitch = document.getElementById('privacySwitch');
    if (privacySwitch) {
        privacySwitch.addEventListener('change', function() {
            profileManager.updateSettings({ privacy: this.checked });
            profileManager.showNotification('Налаштування приватності оновлено!', 'info');
        });
    }

    // Синхронизация при переходе между страницами
    window.addEventListener('focus', function() {
        profileManager.loadProfile();
        profileManager.updateUI();
    });
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}