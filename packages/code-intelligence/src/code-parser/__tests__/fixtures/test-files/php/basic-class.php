<?php
/**
 * Basic class example for testing
 */

namespace Math;

class Calculator
{
    private array $history = [];

    public function __construct()
    {
        $this->history = [];
    }

    public function add(float $a, float $b): float
    {
        $result = $a + $b;
        $this->history[] = [
            'operation' => 'add',
            'a' => $a,
            'b' => $b,
            'result' => $result
        ];
        return $result;
    }

    public function subtract(float $a, float $b): float
    {
        $result = $a - $b;
        $this->history[] = [
            'operation' => 'subtract',
            'a' => $a,
            'b' => $b,
            'result' => $result
        ];
        return $result;
    }

    public function multiply(float $a, float $b): float
    {
        $result = $a * $b;
        $this->history[] = [
            'operation' => 'multiply',
            'a' => $a,
            'b' => $b,
            'result' => $result
        ];
        return $result;
    }

    public function getHistory(): array
    {
        return $this->history;
    }

    public static function create(): self
    {
        return new self();
    }

    public function getOperationCount(): int
    {
        return count($this->history);
    }
}

// Usage example
$calculator = Calculator::create();
$result = $calculator->add(5, 3);
echo "5 + 3 = {$result}\n";
echo "Operations performed: " . $calculator->getOperationCount() . "\n";
?>