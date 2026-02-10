const { formatCurrency } = require('./lib/format');

console.log(formatCurrency(1234567.89));
console.log(formatCurrency(12345.00));
console.log(formatCurrency(0));
console.log(formatCurrency(null));
