/**
 * Comprehensive Java test file for parser verification
 */
package com.example.test;

import java.util.List;
import java.util.ArrayList;
import java.io.Serializable;

/**
 * Interface defining greeting capabilities
 */
public interface Greeter {
    String greet();
    void setGreeting(String greeting);
    default String getDefaultGreeting() {
        return "Hello";
    }
}

/**
 * Abstract base class for persons
 */
public abstract class BasePerson implements Serializable {
    protected String name;
    private static final long serialVersionUID = 1L;
    
    public BasePerson(String name) {
        this.name = name;
    }
    
    public abstract String getRole();
    
    public String getName() {
        return this.name;
    }
}

/**
 * Test Java class with comprehensive features
 */
public class TestClass extends BasePerson implements Greeter {
    
    private String greeting = "Hello";
    private static int instanceCount = 0;
    public static final String DEFAULT_ROLE = "user";
    
    // Constructor
    public TestClass(String name) {
        super(name);
        instanceCount++;
    }
    
    @Override
    public String greet() {
        return this.greeting + ", " + this.name + "!";
    }
    
    @Override
    public void setGreeting(String greeting) {
        this.greeting = greeting;
    }
    
    @Override
    public String getRole() {
        return DEFAULT_ROLE;
    }
    
    public static int getInstanceCount() {
        return instanceCount;
    }
    
    private boolean validateName(String name) {
        return name != null && name.length() > 0;
    }
    
    // Inner class
    public static class Builder {
        private String name;
        
        public Builder setName(String name) {
            this.name = name;
            return this;
        }
        
        public TestClass build() {
            return new TestClass(name);
        }
    }
}

/**
 * Utility class with static methods
 */
public final class TestUtils {
    
    private TestUtils() {
        // Utility class
    }
    
    public static int calculateSum(int x, int y) {
        return x + y;
    }
    
    public static <T> List<T> createList() {
        return new ArrayList<>();
    }
}