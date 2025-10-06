<?php
namespace App\Repository;

use App\Contracts\RepositoryInterface;
use App\Utils\Logger;

class UserRepository implements RepositoryInterface {
    public function __construct(private Logger $logger) {}

    public function findById(int $id): string {
        $this->logger->info("Finding user {$id}");
        return "User#{$id}";
    }
}

