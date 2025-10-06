<?php
namespace App\Contracts;

interface RepositoryInterface {
    public function findById(int $id): string;
}

