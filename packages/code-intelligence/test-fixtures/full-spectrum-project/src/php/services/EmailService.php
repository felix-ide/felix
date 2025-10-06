<?php

namespace Fixture\Services;

require_once __DIR__ . '/NotifierInterface.php';

use DateTimeImmutable;

trait FormatsMessages
{
    protected function formatSubject(string $subject): string
    {
        return '[Fixture] ' . $subject;
    }
}

class EmailService implements NotifierInterface
{
    use FormatsMessages;

    /** @var array<string> */
    private array $recipients = [];

    public function registerRecipient(string $email): void
    {
        $this->recipients[] = $email;
    }

    /**
     * Send a notification email.
     *
     * @param string $subject
     * @param string $body
     * @param array<string> $recipients
     */
    public function notifyFailure(string $subject, string $body = '', array $recipients = []): void
    {
        $target = empty($recipients) ? $this->recipients : $recipients;
        $issuedAt = new DateTimeImmutable('now');
        $message = $this->formatSubject($subject) . ' [' . $issuedAt->format(DateTimeImmutable::RFC3339_EXTENDED) . ']';
        foreach ($target as $address) {
            error_log("Email to {$address}: {$message} {$body}");
        }
    }
}
