package com.example.services;

import com.example.models.User;
import com.example.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Optional;
import java.util.HashMap;
import java.util.Map;

/**
 * Service class for user operations
 */
@Service
public class UserService {
    private final UserRepository repository;
    private final Map<Long, User> cache = new HashMap<>();

    @Autowired
    public UserService(UserRepository repository) {
        this.repository = repository;
    }

    /**
     * Get user by ID
     * @param id User ID
     * @return Optional containing user if found
     */
    public Optional<User> getUser(Long id) {
        if (cache.containsKey(id)) {
            return Optional.of(cache.get(id));
        }

        Optional<User> user = repository.findById(id);
        user.ifPresent(u -> cache.put(id, u));

        return user;
    }

    /**
     * Create a new user
     */
    public User createUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);

        return repository.save(user);
    }

    private boolean validateEmail(String email) {
        return email != null && email.contains("@");
    }

    // Inner class for statistics
    public static class UserStats {
        private int totalUsers;
        private int activeUsers;

        public UserStats(int total, int active) {
            this.totalUsers = total;
            this.activeUsers = active;
        }

        public double getActivePercentage() {
            return (double) activeUsers / totalUsers * 100;
        }
    }
}

interface UserOperations {
    Optional<User> getUser(Long id);
    User createUser(String name, String email);
    void deleteUser(Long id);
}
