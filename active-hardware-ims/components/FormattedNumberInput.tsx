'use client'

import { useState, useEffect, useRef } from 'react'

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number
    onChange: (value: number) => void
}

export default function FormattedNumberInput({ value, onChange, className, ...props }: FormattedNumberInputProps) {
    const [displayValue, setDisplayValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // Format number to string with commas
    const format = (num: number): string => {
        if (isNaN(num)) return ''
        const parts = num.toString().split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        return parts.join('.')
    }

    // Initialize display value
    useEffect(() => {
        const formatted = format(value)
        if (formatted !== displayValue) {
            setDisplayValue(formatted)
        }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/,/g, '')

        // Allow numeric values and decimals
        if (rawValue === '' || rawValue === '-' || rawValue === '.' || rawValue === '-.') {
            setDisplayValue(e.target.value)
            return
        }

        const numValue = parseFloat(rawValue)
        if (!isNaN(numValue)) {
            // Keep the trailing dot or zeros after dot for typing experience
            if (rawValue.endsWith('.') || (rawValue.includes('.') && rawValue.endsWith('0'))) {
                setDisplayValue(e.target.value)
            } else {
                setDisplayValue(format(numValue))
            }
            onChange(numValue)
        }
    }

    const handleBlur = () => {
        // Final normalization on blur
        const numValue = parseFloat(displayValue.replace(/,/g, ''))
        if (!isNaN(numValue)) {
            const finalFormatted = format(numValue)
            setDisplayValue(finalFormatted)
            onChange(numValue)
        } else {
            setDisplayValue('0')
            onChange(0)
        }
    }

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={className}
        />
    )
}
