const MAX_ERRORS = 50;
const STORAGE_KEY = 'strata_errors';

export type LoggedError = {
  timestamp: number;
  type: 'uncaught' | 'unhandledrejection' | 'boundary';
  message: string;
  stack?: string;
};

export function getErrorLog(): LoggedError[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function logError(type: LoggedError['type'], message: string, stack?: string) {
  const log = getErrorLog();
  log.unshift({ timestamp: Math.floor(Date.now() / 1000), type, message, stack });
  if (log.length > MAX_ERRORS) log.length = MAX_ERRORS;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch { /* localStorage full — ignore */ }
  console.error(`[strata:${type}]`, message, stack ?? '');
}

export function clearErrorLog() {
  localStorage.removeItem(STORAGE_KEY);
}

export function installGlobalHandlers() {
  window.addEventListener('error', (e) => {
    logError('uncaught', e.message, e.error?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const err = e.reason;
    logError(
      'unhandledrejection',
      err instanceof Error ? err.message : String(err),
      err instanceof Error ? err.stack : undefined,
    );
  });
}
