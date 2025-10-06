<?php
class UserController {
    public function showProfile($userId) {
        $user = User::find($userId);
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>User Profile</title>
            <style>
                body { font-family: Arial; }
                .profile { padding: 20px; }
            </style>
        </head>
        <body>
            <div class="profile">
                <h1><?= htmlspecialchars($user->name) ?></h1>
                <script>
                    const userId = <?= json_encode($userId) ?>;
                    console.log('Loading profile for user:', userId);

                    async function loadUserData() {
                        const response = await fetch(`/api/users/${userId}`);
                        const data = await response.json();
                        document.getElementById('bio').textContent = data.bio;
                    }

                    loadUserData();
                </script>
                <div id="bio">Loading...</div>
            </div>
        </body>
        </html>
        <?php
    }

    public function updateProfile($userId, $data) {
        $sql = "UPDATE users SET name = ?, bio = ? WHERE id = ?";
        DB::execute($sql, [$data['name'], $data['bio'], $userId]);
    }
}