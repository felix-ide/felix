#!/usr/bin/env python3
"""Test file for Python class features"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import ClassVar, Optional, List, Dict, Any
from enum import Enum, auto
import asyncio


# Basic class
class BasicClass:
    """Basic Python class with docstring"""
    
    def __init__(self, name: str, value: int = 0):
        self.name = name
        self.value = value
        self._protected = "protected"
        self.__private = "private"
    
    def method(self) -> str:
        """Regular instance method"""
        return f"Name: {self.name}"
    
    def _protected_method(self) -> str:
        """Protected method (convention)"""
        return self._protected
    
    def __private_method(self) -> str:
        """Private method (name mangling)"""
        return self.__private


# Class with class and static methods
class StaticMethodClass:
    """Class demonstrating static and class methods"""
    
    class_variable: ClassVar[int] = 42
    
    def __init__(self, instance_var: str):
        self.instance_var = instance_var
    
    @classmethod
    def class_method(cls) -> int:
        """Class method with cls parameter"""
        return cls.class_variable
    
    @staticmethod
    def static_method(x: int, y: int) -> int:
        """Static method without self or cls"""
        return x + y
    
    @classmethod
    def alternative_constructor(cls, data: str) -> 'StaticMethodClass':
        """Alternative constructor pattern"""
        return cls(data.upper())


# Properties and descriptors
class PropertyClass:
    """Class with properties and descriptors"""
    
    def __init__(self, value: int = 0):
        self._value = value
    
    @property
    def value(self) -> int:
        """Getter property"""
        return self._value
    
    @value.setter
    def value(self, new_value: int) -> None:
        """Setter property"""
        if new_value < 0:
            raise ValueError("Value must be non-negative")
        self._value = new_value
    
    @value.deleter
    def value(self) -> None:
        """Deleter property"""
        del self._value
    
    @property
    def computed(self) -> str:
        """Read-only computed property"""
        return f"Computed: {self._value * 2}"


# Inheritance
class BaseClass:
    """Base class for inheritance"""
    
    def __init__(self, base_attr: str):
        self.base_attr = base_attr
    
    def base_method(self) -> str:
        return "base"
    
    def overridden_method(self) -> str:
        return "base version"


class DerivedClass(BaseClass):
    """Derived class with inheritance"""
    
    def __init__(self, base_attr: str, derived_attr: int):
        super().__init__(base_attr)
        self.derived_attr = derived_attr
    
    def derived_method(self) -> str:
        return "derived"
    
    def overridden_method(self) -> str:
        return "derived version"
    
    def call_super(self) -> str:
        return super().overridden_method()


# Multiple inheritance
class Mixin1:
    """First mixin class"""
    
    def mixin1_method(self) -> str:
        return "mixin1"


class Mixin2:
    """Second mixin class"""
    
    def mixin2_method(self) -> str:
        return "mixin2"


class MultipleInheritance(BaseClass, Mixin1, Mixin2):
    """Class with multiple inheritance"""
    
    def __init__(self, base_attr: str):
        super().__init__(base_attr)
    
    def combined_method(self) -> str:
        return f"{self.base_method()}, {self.mixin1_method()}, {self.mixin2_method()}"


# Abstract base class
class AbstractBase(ABC):
    """Abstract base class"""
    
    @abstractmethod
    def abstract_method(self) -> str:
        """Must be implemented by subclasses"""
        pass
    
    @abstractmethod
    def another_abstract(self, value: int) -> int:
        """Another abstract method"""
        pass
    
    def concrete_method(self) -> str:
        """Concrete method in abstract class"""
        return "concrete"


class ConcreteImplementation(AbstractBase):
    """Concrete implementation of abstract class"""
    
    def abstract_method(self) -> str:
        return "implemented"
    
    def another_abstract(self, value: int) -> int:
        return value * 2


# Dataclass
@dataclass
class DataClassExample:
    """Example dataclass with various features"""
    
    name: str
    value: int
    optional: Optional[str] = None
    items: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Class variable
    class_var: ClassVar[str] = "shared"
    
    def __post_init__(self):
        """Post-initialization processing"""
        self.computed = self.value * 2
    
    def method(self) -> str:
        return f"DataClass: {self.name}"


# Frozen dataclass (immutable)
@dataclass(frozen=True)
class FrozenDataClass:
    """Immutable dataclass"""
    
    x: int
    y: int
    
    def distance(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5


# Slots
class SlottedClass:
    """Class using __slots__ for memory efficiency"""
    
    __slots__ = ['x', 'y', 'z']
    
    def __init__(self, x: int, y: int, z: int):
        self.x = x
        self.y = y
        self.z = z


# Metaclass
class SingletonMeta(type):
    """Metaclass for singleton pattern"""
    
    _instances = {}
    
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Singleton(metaclass=SingletonMeta):
    """Singleton class using metaclass"""
    
    def __init__(self):
        self.value = "singleton"


# Context manager class
class ContextManager:
    """Class implementing context manager protocol"""
    
    def __init__(self, name: str):
        self.name = name
    
    def __enter__(self):
        print(f"Entering {self.name}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        print(f"Exiting {self.name}")
        return False
    
    def do_something(self) -> str:
        return f"Working in {self.name}"


# Iterator class
class IteratorClass:
    """Class implementing iterator protocol"""
    
    def __init__(self, data: List[Any]):
        self.data = data
        self.index = 0
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self.index >= len(self.data):
            raise StopIteration
        value = self.data[self.index]
        self.index += 1
        return value


# Async class
class AsyncClass:
    """Class with async methods"""
    
    async def async_method(self) -> str:
        """Async method"""
        await asyncio.sleep(0.1)
        return "async result"
    
    async def __aenter__(self):
        """Async context manager enter"""
        await asyncio.sleep(0.1)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await asyncio.sleep(0.1)
        return False
    
    def __aiter__(self):
        """Async iterator"""
        return self
    
    async def __anext__(self):
        """Async iterator next"""
        await asyncio.sleep(0.1)
        raise StopAsyncIteration


# Operator overloading
class Vector:
    """Class with operator overloading"""
    
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
    
    def __add__(self, other: 'Vector') -> 'Vector':
        return Vector(self.x + other.x, self.y + other.y)
    
    def __sub__(self, other: 'Vector') -> 'Vector':
        return Vector(self.x - other.x, self.y - other.y)
    
    def __mul__(self, scalar: float) -> 'Vector':
        return Vector(self.x * scalar, self.y * scalar)
    
    def __eq__(self, other: 'Vector') -> bool:
        return self.x == other.x and self.y == other.y
    
    def __repr__(self) -> str:
        return f"Vector({self.x}, {self.y})"
    
    def __str__(self) -> str:
        return f"({self.x}, {self.y})"
    
    def __len__(self) -> int:
        return 2
    
    def __getitem__(self, index: int) -> float:
        if index == 0:
            return self.x
        elif index == 1:
            return self.y
        raise IndexError("Vector index out of range")


# Descriptor class
class Descriptor:
    """Custom descriptor class"""
    
    def __init__(self, name: str):
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)
    
    def __set__(self, obj, value):
        obj.__dict__[self.name] = value
    
    def __delete__(self, obj):
        del obj.__dict__[self.name]


class ClassWithDescriptor:
    """Class using custom descriptor"""
    
    managed = Descriptor('managed')
    
    def __init__(self):
        self.managed = "managed value"


# Enum class
class Status(Enum):
    """Enumeration class"""
    
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = auto()


# Type annotations and generics
from typing import TypeVar, Generic

T = TypeVar('T')

class GenericClass(Generic[T]):
    """Generic class with type parameter"""
    
    def __init__(self, value: T):
        self.value = value
    
    def get(self) -> T:
        return self.value
    
    def set(self, value: T) -> None:
        self.value = value