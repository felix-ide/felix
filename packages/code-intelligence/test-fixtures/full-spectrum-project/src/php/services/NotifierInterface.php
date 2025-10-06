<?php

namespace Fixture\Services;

interface NotifierInterface
{
    /**
     * @param string $subject
     * @param string $body
     * @param array<string> $recipients
     */
    public function notifyFailure(string $subject, string $body = '', array $recipients = []): void;
}
