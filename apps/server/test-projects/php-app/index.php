<?php
require_once __DIR__ . '/src/Contracts/RepositoryInterface.php';
require_once __DIR__ . '/src/Utils/Logger.php';
require_once __DIR__ . '/src/Repository/UserRepository.php';

use App\Repository\UserRepository;
use App\Utils\Logger;

$repo = new UserRepository(new Logger());
echo $repo->findById(42);

