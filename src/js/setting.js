
    window.onload = function () {
    const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
    if (profile.username) document.getElementById('username').innerText = profile.username;
    if (profile.bio) document.getElementById('bio').innerText = profile.bio;
    if (profile.email) document.getElementById('email').innerText = profile.email;
    if (profile.phone) document.getElementById('phone').innerText = profile.phone;
    if (profile.country) document.getElementById('country').innerText = profile.country;
    if (profile.avatar) document.getElementById('avatar').src = profile.avatar;

    // Notification switch
    const notifSwitch = document.getElementById('notifSwitch');
    if (localStorage.getItem('notifications') === 'off') {
    notifSwitch.checked = false;
}
    notifSwitch.addEventListener('change', function() {
    localStorage.setItem('notifications', this.checked ? 'on' : 'off');
    // alert убран
});

    // Language select
    const langSelect = document.getElementById('langSelect');
    if (localStorage.getItem('lang')) {
    langSelect.value = localStorage.getItem('lang');
}
    langSelect.addEventListener('change', function() {
    localStorage.setItem('lang', this.value);
    alert('Язык интерфейса изменён на: ' + this.options[this.selectedIndex].text);
});

    // Privacy switch
    const privacySwitch = document.getElementById('privacySwitch');
    if (localStorage.getItem('privateProfile') === 'on') {
    privacySwitch.checked = true;
}
    privacySwitch.addEventListener('change', function() {
    localStorage.setItem('privateProfile', this.checked ? 'on' : 'off');
    // alert убран
});
}

    function editField(field) {
    let label = '';
    switch(field) {
    case 'username': label = 'Введите имя:'; break;
    case 'bio': label = 'Введите статус:'; break;
    case 'email': label = 'Введите email:'; break;
    case 'phone': label = 'Введите телефон:'; break;
    case 'country': label = 'Введите страну:'; break;
}
    const el = document.getElementById(field);
    const current = el.innerText;
    const value = prompt(label, current === '—' ? '' : current);
    if (value !== null) {
    el.innerText = value || '—';
    const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
    profile[field] = value;
    localStorage.setItem('userProfile', JSON.stringify(profile));
}
}

    document.getElementById('avatar-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
    const dataUrl = event.target.result;
    document.getElementById('avatar').src = dataUrl;

    // Сохраняем новый аватар в localStorage
    const profile = JSON.parse(localStorage.getItem('userProfile')) || {};
    profile.avatar = dataUrl;
    localStorage.setItem('userProfile', JSON.stringify(profile));
};
    reader.readAsDataURL(file);
});

    function logout() {
    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
    localStorage.removeItem('userProfile');
    window.location.reload();
}
}

    function clearProfile() {
    if (confirm('Сбросить все данные профиля?')) {
    localStorage.removeItem('userProfile');
    window.location.reload();
}
}
