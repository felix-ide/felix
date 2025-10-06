export function greet(name) {
  console.log(`Hello, ${name}!`);
  return `Hello, ${name}!`;
}

export class Greeter {
  constructor(prefix = 'Hello') {
    this.prefix = prefix;
  }
  say(name) {
    return `${this.prefix}, ${name}!`;
  }
}

// basic usage
const g = new Greeter('Hi');
g.say('there');

