<?php
/**
 * Comprehensive PHP test file for parser verification
 */

namespace TestApp\Models;

/**
 * Interface defining greeting capabilities
 */
interface GreetableInterface {
    public function greet(): string;
    public function setGreeting(string $greeting): void;
}

/**
 * Trait providing logging functionality
 */
trait LoggableTrait {
    protected $logger;
    
    public function log(string $message): void {
        // Log implementation
    }
}

/**
 * Base person class
 */
abstract class BasePerson {
    protected string $name;
    
    public function __construct(string $name) {
        $this->name = $name;
    }
    
    abstract public function getRole(): string;
}

/**
 * Test PHP class with comprehensive features
 */
class TestClass extends BasePerson implements GreetableInterface {
    use LoggableTrait;
    
    private string $greeting = "Hello";
    private static int $instanceCount = 0;
    const DEFAULT_ROLE = "user";
    
    public function __construct(string $name) {
        parent::__construct($name);
        self::$instanceCount++;
    }
    
    public function greet(): string {
        return $this->greeting . ", " . $this->name . "!";
    }
    
    public function setGreeting(string $greeting): void {
        $this->greeting = $greeting;
    }
    
    public function getRole(): string {
        return self::DEFAULT_ROLE;
    }
    
    public static function getInstanceCount(): int {
        return self::$instanceCount;
    }
    
    private function validateName(string $name): bool {
        return strlen($name) > 0;
    }
}

/**
 * Standalone function for testing
 */
function calculateSum(int $x, int $y): int {
    return $x + $y;
}

// Global constant
const GLOBAL_CONSTANT = "test_value";
?>