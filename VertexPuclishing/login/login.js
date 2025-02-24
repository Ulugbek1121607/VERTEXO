document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Read user data from user.json
        fetch('../user.json')
            .then(response => response.json())
            .then(users => {
                // Find the user by username or email and password
                const user = users.find(u => (u.username === username || u.email === username) && u.password === password);

                if (user) {
                    // Redirect to login/main2.html
                    window.location.href = 'main2.html';
                } else {
                    alert('Invalid username or password');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            });
    });
});
