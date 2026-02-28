import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A'
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'N/A'
    return d.toISOString().split('T')[0]
}

export function formatDateTime(date: Date | string | null | undefined): string {
    if (!date) return 'N/A'
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'N/A'

    const datePart = d.toISOString().split('T')[0]
    const timePart = d.toTimeString().split(' ')[0].substring(0, 5) // HH:mm

    return `${datePart} ${timePart}`
}

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Converts a snake_case or UPPER_CASE status string to a human-readable
 * title-case format. e.g., "READY_FOR_BUILD" -> "Ready For Build"
 */
export function formatStatus(status: string | null | undefined): string {
    if (!status) return 'N/A'
    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
}
