export class WriteQueue {
  private last: Promise<any> = Promise.resolve();

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.last.then(fn, fn);
    // Keep chain alive; swallow to avoid unhandled rejections but keep return rejecting
    this.last = run.catch(() => undefined);
    return run;
  }
}

