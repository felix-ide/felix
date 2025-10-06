#!/usr/bin/env python3
"""Test file for Python function features"""

import asyncio
import functools
from typing import Any, Callable, Optional, Union, List, Dict, Tuple, TypeVar, Generator, AsyncGenerator
from collections.abc import Iterable


# Basic function
def basic_function(param1: str, param2: int) -> str:
    """Basic function with type hints"""
    return f"{param1}: {param2}"


# Function with default parameters
def default_params(a: int = 1, b: int = 2, c: Optional[str] = None) -> int:
    """Function with default parameter values"""
    result = a + b
    if c:
        result += len(c)
    return result


# Function with *args and **kwargs
def variable_args(*args: Any, **kwargs: Any) -> Dict[str, Any]:
    """Function with variable arguments"""
    return {
        'args': args,
        'kwargs': kwargs,
        'count': len(args) + len(kwargs)
    }


# Positional-only parameters (Python 3.8+)
def positional_only(a, b, /, c=None) -> Tuple[Any, Any, Any]:
    """Function with positional-only parameters"""
    return (a, b, c)


# Keyword-only parameters
def keyword_only(a: int, *, b: str, c: float = 3.14) -> Dict[str, Any]:
    """Function with keyword-only parameters"""
    return {'a': a, 'b': b, 'c': c}


# Mixed parameter types
def mixed_params(pos_only, /, standard, *args, kw_only, **kwargs) -> Dict[str, Any]:
    """Function with all parameter types"""
    return {
        'pos_only': pos_only,
        'standard': standard,
        'args': args,
        'kw_only': kw_only,
        'kwargs': kwargs
    }


# Lambda functions
simple_lambda = lambda x: x * 2
complex_lambda = lambda x, y=10: x + y if x > 0 else y - x


# Nested functions
def outer_function(x: int) -> Callable[[int], int]:
    """Function with nested function (closure)"""
    
    def inner_function(y: int) -> int:
        """Inner function accessing outer scope"""
        return x + y
    
    return inner_function


# Decorator function
def decorator(func: Callable) -> Callable:
    """Simple decorator function"""
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"Before {func.__name__}")
        result = func(*args, **kwargs)
        print(f"After {func.__name__}")
        return result
    
    return wrapper


# Parameterized decorator
def parametrized_decorator(prefix: str = "LOG"):
    """Decorator with parameters"""
    
    def actual_decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            print(f"{prefix}: Calling {func.__name__}")
            return func(*args, **kwargs)
        return wrapper
    
    return actual_decorator


# Using decorators
@decorator
def decorated_function(value: str) -> str:
    """Function with decorator"""
    return value.upper()


@parametrized_decorator("DEBUG")
def debug_function(x: int) -> int:
    """Function with parameterized decorator"""
    return x * 2


# Multiple decorators
@decorator
@parametrized_decorator("INFO")
def multi_decorated(data: str) -> str:
    """Function with multiple decorators"""
    return data


# Generator function
def generator_function(n: int) -> Generator[int, None, None]:
    """Generator function yielding values"""
    for i in range(n):
        yield i * 2


def infinite_generator() -> Generator[int, None, None]:
    """Infinite generator"""
    count = 0
    while True:
        yield count
        count += 1


# Generator with send
def coroutine_generator() -> Generator[int, str, None]:
    """Generator that can receive values"""
    value = 0
    while True:
        received = yield value
        if received:
            value = len(received)
        else:
            value += 1


# Async functions
async def async_function(delay: float = 0.1) -> str:
    """Async function with await"""
    await asyncio.sleep(delay)
    return "async complete"


async def async_generator_function(n: int) -> AsyncGenerator[int, None]:
    """Async generator function"""
    for i in range(n):
        await asyncio.sleep(0.01)
        yield i


# Higher-order functions
def higher_order(func: Callable[[int], int]) -> Callable[[int], int]:
    """Function that takes and returns functions"""
    
    def enhanced(x: int) -> int:
        result = func(x)
        return result * 2
    
    return enhanced


# Currying
def curry(a: int) -> Callable[[int], Callable[[int], int]]:
    """Curried function"""
    
    def curry_b(b: int) -> Callable[[int], int]:
        def curry_c(c: int) -> int:
            return a + b + c
        return curry_c
    
    return curry_b


# Partial application
from functools import partial

def multi_param(a: int, b: int, c: int, d: int) -> int:
    """Function for partial application"""
    return a + b + c + d

partial_func = partial(multi_param, 1, 2)


# Memoization decorator
def memoize(func: Callable) -> Callable:
    """Memoization decorator"""
    cache = {}
    
    @functools.wraps(func)
    def wrapper(*args):
        if args in cache:
            return cache[args]
        result = func(*args)
        cache[args] = result
        return result
    
    return wrapper


@memoize
def fibonacci(n: int) -> int:
    """Memoized fibonacci function"""
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


# Using functools.lru_cache
@functools.lru_cache(maxsize=128)
def cached_function(x: int, y: int) -> int:
    """Function with LRU cache"""
    return x ** y


# Type checking with generics
T = TypeVar('T')
U = TypeVar('U')

def generic_function(items: List[T], transform: Callable[[T], U]) -> List[U]:
    """Generic function with type variables"""
    return [transform(item) for item in items]


# Function annotations access
def annotated_function(x: int, y: str = "default") -> Dict[str, Any]:
    """Function with annotations"""
    return {
        'result': f"{x}: {y}",
        'annotations': annotated_function.__annotations__
    }


# Recursive function
def recursive_factorial(n: int) -> int:
    """Recursive factorial implementation"""
    if n <= 1:
        return 1
    return n * recursive_factorial(n - 1)


# Tail recursion (not optimized in Python)
def tail_recursive_sum(n: int, accumulator: int = 0) -> int:
    """Tail recursive sum (Python doesn't optimize)"""
    if n == 0:
        return accumulator
    return tail_recursive_sum(n - 1, accumulator + n)


# Function with side effects
global_state = []

def side_effect_function(value: Any) -> None:
    """Function that modifies global state"""
    global global_state
    global_state.append(value)


# Pure function
def pure_function(x: int, y: int) -> int:
    """Pure function with no side effects"""
    return x * y + (x - y)


# Context manager as function
from contextlib import contextmanager

@contextmanager
def function_context(name: str):
    """Function-based context manager"""
    print(f"Entering {name}")
    try:
        yield name
    finally:
        print(f"Exiting {name}")


# Operator function
import operator

def use_operator_functions(a: int, b: int) -> Dict[str, int]:
    """Using operator module functions"""
    return {
        'add': operator.add(a, b),
        'mul': operator.mul(a, b),
        'pow': operator.pow(a, b)
    }


# Class method as function
class FunctionContainer:
    """Container for methods that act like functions"""
    
    @staticmethod
    def static_func(x: int) -> int:
        return x * 2
    
    @classmethod
    def class_func(cls, x: int) -> str:
        return f"{cls.__name__}: {x}"


# Callable class (functor)
class CallableClass:
    """Class that can be called like a function"""
    
    def __init__(self, multiplier: int):
        self.multiplier = multiplier
    
    def __call__(self, value: int) -> int:
        return value * self.multiplier


# Export some functions
__all__ = [
    'basic_function',
    'default_params',
    'variable_args',
    'generator_function',
    'async_function',
    'decorator',
    'memoize',
    'fibonacci',
    'generic_function'
]