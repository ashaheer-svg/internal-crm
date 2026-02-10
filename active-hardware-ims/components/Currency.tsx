import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface CurrencyProps {
    amount: number | null | undefined
    className?: string
}

export function Currency({ amount, className }: CurrencyProps) {
    // room for 10 digits:
    // 9,999,999,999.99 is the max we expect to align
    // We use tabular-nums for character alignment
    // We use a fixed minimum width to ensure "room"

    return (
        <div className={cn("inline-block text-right font-mono tabular-nums min-w-[12rem] whitespace-nowrap", className)}>
            {formatCurrency(amount)}
        </div>
    )
}
