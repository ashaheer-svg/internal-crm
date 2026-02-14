
const isProduction = process.env.NODE_ENV === 'production'

function formatLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) {
    const timestamp = new Date().toISOString()

    // In production, use structured JSON logging for better parsing by cloud providers
    if (isProduction) {
        return JSON.stringify({
            timestamp,
            level,
            message,
            data
        })
    }

    // In development, use colorful output for readability
    const colors = {
        INFO: '\x1b[36m', // Cyan
        WARN: '\x1b[33m', // Yellow
        ERROR: '\x1b[31m', // Red
        DEBUG: '\x1b[90m', // Gray
        RESET: '\x1b[0m'
    }

    const color = colors[level] || colors.RESET
    const dataString = data ? `\n${JSON.stringify(data, null, 2)}` : ''

    return `${color}[${level}]${colors.RESET} ${timestamp}: ${message}${dataString}`
}

export const logger = {
    info: (message: string, data?: any) => {
        console.log(formatLog('INFO', message, data))
    },
    warn: (message: string, data?: any) => {
        console.warn(formatLog('WARN', message, data))
    },
    error: (message: string, error?: any) => {
        // Handle Error objects specifically to extract stack traces
        const errorData = error instanceof Error ? { ...error, message: error.message, stack: error.stack } : error
        console.error(formatLog('ERROR', message, errorData))
    },
    debug: (message: string, data?: any) => {
        console.debug(formatLog('DEBUG', message, data))
    }
}
