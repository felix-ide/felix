<?php
namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;

/**
 * User service class
 */
class UserService
{
    private UserRepository $repository;
    private array $cache = [];

    public function __construct(UserRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Get user by ID
     *
     * @param int $id
     * @return User|null
     */
    public function getUser(int $id): ?User
    {
        if (isset($this->cache[$id])) {
            return $this->cache[$id];
        }

        $user = $this->repository->find($id);
        if ($user) {
            $this->cache[$id] = $user;
        }

        return $user;
    }

    /**
     * Create a new user
     */
    public function createUser(array $data): User
    {
        $user = new User();
        $user->name = $data['name'];
        $user->email = $data['email'];

        return $this->repository->save($user);
    }

    private function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

trait CacheableTrait
{
    protected array $cache = [];

    protected function getCached(string $key)
    {
        return $this->cache[$key] ?? null;
    }

    protected function setCached(string $key, $value): void
    {
        $this->cache[$key] = $value;
    }
}
