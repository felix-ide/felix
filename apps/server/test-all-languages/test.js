// JavaScript Test
export class TestJSClass {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    return `Hello, ${this.name}\!`;
  }
}

export function testFunction(x, y) {
  return x + y;
}
EOF < /dev/null