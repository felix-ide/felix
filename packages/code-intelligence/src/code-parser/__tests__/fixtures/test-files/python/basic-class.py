"""
Basic class example for testing
"""
from typing import List, Dict, Any


class Calculator:
    """A simple calculator with history tracking."""

    def __init__(self):
        self.history: List[Dict[str, Any]] = []

    def add(self, a: float, b: float) -> float:
        """Add two numbers and record the operation."""
        result = a + b
        self.history.append({
            'operation': 'add',
            'a': a,
            'b': b,
            'result': result
        })
        return result

    def subtract(self, a: float, b: float) -> float:
        """Subtract b from a and record the operation."""
        result = a - b
        self.history.append({
            'operation': 'subtract',
            'a': a,
            'b': b,
            'result': result
        })
        return result

    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers and record the operation."""
        result = a * b
        self.history.append({
            'operation': 'multiply',
            'a': a,
            'b': b,
            'result': result
        })
        return result

    def get_history(self) -> List[Dict[str, Any]]:
        """Get the operation history."""
        return self.history.copy()

    @staticmethod
    def create() -> 'Calculator':
        """Factory method to create a new calculator."""
        return Calculator()

    @property
    def operation_count(self) -> int:
        """Get the number of operations performed."""
        return len(self.history)


if __name__ == '__main__':
    calc = Calculator.create()
    result = calc.add(5, 3)
    print(f"5 + 3 = {result}")
    print(f"Operations performed: {calc.operation_count}")