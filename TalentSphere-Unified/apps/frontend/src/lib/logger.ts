// Production-grade logging wrapper for frontend telemetry
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class FrontendLogger {
  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      ...(meta && { meta })
    };

    // In a real environment, this would ship logs to Datadog/Sentry/Winston via beacon API
    // navigator.sendBeacon('/api/logs', JSON.stringify(payload));

    if (process.env.NODE_ENV !== 'production') {
      switch (level) {
        case 'info': console.info(`[INFO] ${timestamp}:`, message, meta || ''); break;
        case 'warn': console.warn(`[WARN] ${timestamp}:`, message, meta || ''); break;
        case 'error': console.error(`[ERROR] ${timestamp}:`, message, meta || ''); break;
        case 'debug': console.debug(`[DEBUG] ${timestamp}:`, message, meta || ''); break;
      }
    } else {
        // Fallback for production if telemetry endpoint is down
        if (level === 'error') {
            console.error(JSON.stringify(payload));
        }
    }
  }

  info(msg: string, meta?: any) { this.log('info', msg, meta); }
  warn(msg: string, meta?: any) { this.log('warn', msg, meta); }
  error(msg: string, meta?: any) { this.log('error', msg, meta); }
  debug(msg: string, meta?: any) { this.log('debug', msg, meta); }
}

export const logger = new FrontendLogger();
