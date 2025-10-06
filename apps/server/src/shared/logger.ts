import { appConfig } from './config.js';

type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';
const order: Record<Exclude<Level, 'silent'>, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

const resolveLevel = (): Level => {
  const override = (process.env.LOG_LEVEL || '').toLowerCase();
  if ((['debug', 'info', 'warn', 'error', 'silent'] as const).includes(override as Level)) {
    return override as Level;
  }
  return appConfig.logLevel;
};

const shouldLog = (target: Exclude<Level, 'silent'>): boolean => {
  const lvl = resolveLevel();
  if (lvl === 'silent') return false;
  return order[target] >= order[lvl as Exclude<Level, 'silent'>];
};

const forceStderr = (): boolean => process.env.FORCE_STDERR_LOGS === '1';

const pickWriter = (method: 'log' | 'warn' | 'error') => {
  switch (method) {
    case 'warn':
      return console.warn.bind(console);
    case 'error':
      return console.error.bind(console);
    case 'log':
    default:
      return console.log.bind(console);
  }
};

const logWith = (target: Exclude<Level, 'silent'>, method: 'log' | 'warn' | 'error') => {
  const defaultWriter = pickWriter(method);
  const stderrWriter = console.error.bind(console);

  return (...args: any[]) => {
    if (!shouldLog(target)) return;
    const writer = forceStderr() ? stderrWriter : defaultWriter;
    writer(`[${target}]`, ...args);
  };
};

export const logger = {
  debug: logWith('debug', 'log'),
  info: logWith('info', 'log'),
  warn: logWith('warn', 'warn'),
  error: logWith('error', 'error'),
};
