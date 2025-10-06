"""
Test Python file for verifying parser functionality
"""

class TestClass:
    """A test class for parser verification"""
    
    def __init__(self, name):
        """Initialize the test class"""
        self.name = name
        self.value = 42
    
    def get_name(self):
        """Get the name"""
        return self.name
    
    def set_value(self, new_value):
        """Set a new value"""
        self.value = new_value
        return self.value

def standalone_function():
    """A standalone function"""
    return "hello world"

# Global variable
GLOBAL_VAR = "test"