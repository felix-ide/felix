<?php
require_once __DIR__ . '/services/EmailService.php';
require_once __DIR__ . '/templates/dashboard.php';

use Fixture\Services\EmailService;
use function Fixture\Templates\render_panel;

$service = new EmailService();
$service->registerRecipient('fixture@example.com');

function renderLayout(array $payload): string {
    $title = $payload['title'] ?? 'Fixture Layout';
    $content = $payload['content'] ?? '';
    ob_start();
    ?>
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title><?= htmlspecialchars($title) ?></title>
        <script type="module" src="../javascript/main.js"></script>
      </head>
      <body>
        <div id="app"><?= $content ?></div>
      </body>
    </html>
    <?php
    return ob_get_clean();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($payload['content'])) {
        $service->notifyFailure('Empty payload submitted');
    }

    $panels = render_panel('Summary', $payload['panels'] ?? []);
    $payload['content'] = ($payload['content'] ?? '') . $panels;

    echo renderLayout($payload);
}
