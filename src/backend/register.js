async function handleRegistration(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    if (password !== confirm) {
        alert('Паролі не співпадають!');
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: username,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            window.location.href = 'cloud.html';
        } else {
            alert('Помилка реєстрації: ' + data.error);
        }
    } catch (error) {
        alert('Помилка підключення до сервера');
        console.error('Error:', error);
    }
}
async function handleEntry(event) {
    event.preventDefault();

    const email = document.getElementById('emailEntry').value;
    const password = document.getElementById('passwordEntry').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            // Зберігаємо дані користувача
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'cloud.html';
        } else {
            alert('Помилка входу: ' + data.error);
        }
    } catch (error) {
        alert('Помилка підключення до сервера');
        console.error('Error:', error);
    }
}