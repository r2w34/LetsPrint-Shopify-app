// Convert amount to words - Indian numbering system
// Based on reference: https://github.com/raqueebqureshi/Gst-Invoice-App

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return "";
  
  if (num < 20) {
    return ones[num];
  }
  
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one > 0 ? " " + ones[one] : "");
  }
  
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;
  return ones[hundred] + " Hundred" + (remainder > 0 ? " " + convertLessThanThousand(remainder) : "");
}

export function convertAmountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  
  // Split into rupees and paise
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let result = "";
  
  if (rupees > 0) {
    // Indian numbering system: Crore, Lakh, Thousand
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;
    
    if (crore > 0) {
      result += convertLessThanThousand(crore) + " Crore ";
    }
    
    if (lakh > 0) {
      result += convertLessThanThousand(lakh) + " Lakh ";
    }
    
    if (thousand > 0) {
      result += convertLessThanThousand(thousand) + " Thousand ";
    }
    
    if (remainder > 0) {
      result += convertLessThanThousand(remainder);
    }
    
    result = result.trim() + " Rupees";
  }
  
  if (paise > 0) {
    result += " and " + convertLessThanThousand(paise) + " Paise";
  }
  
  return result.trim() + " Only";
}

// Examples:
// convertAmountToWords(1234.50) => "One Thousand Two Hundred Thirty Four Rupees and Fifty Paise Only"
// convertAmountToWords(123456.75) => "One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees and Seventy Five Paise Only"
// convertAmountToWords(12345678.00) => "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees Only"
