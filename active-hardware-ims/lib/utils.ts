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
