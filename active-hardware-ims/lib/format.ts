export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) {
        return "Rs. 0.00"
    }

    // Standard US/English formatting (comma grouping)
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'INR', // Uses Symbol, but we want "Rs." usually or we can strip symbol
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount).replace('₹', 'Rs. ')
}
