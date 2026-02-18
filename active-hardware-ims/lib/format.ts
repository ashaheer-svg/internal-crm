export function formatCurrency(amount: number | null | undefined, currency: string = 'INR'): string {
    if (amount === null || amount === undefined) {
        return "Rs. 0.00"
    }

    // Map "Rs." to INR for formatting, but keep display preference if needed
    let code = currency === 'Rs.' ? 'INR' : currency;

    try {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);

        // If generic INR/Rs., enforce "Rs." prefix for consistency with rest of app
        if (code === 'INR') {
            return formatted.replace('₹', 'Rs. ')
        }

        return formatted;
    } catch (e) {
        // Fallback for invalid codes
        return `${currency} ${amount.toFixed(2)}`;
    }
}
