const luhn = require('luhn');

class CardValidationService {
  /**
   * Validate card number using Luhn algorithm
   */
  static validateCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s+/g, '');
    
    if (!/^\d{13,19}$/.test(cleaned)) {
      return {
        valid: false,
        error: 'Card number must be between 13 and 19 digits',
      };
    }

    if (!luhn.validate(cleaned)) {
      return {
        valid: false,
        error: 'Invalid card number (Luhn check failed)',
      };
    }

    return {
      valid: true,
      cardNumber: cleaned,
      type: this.getCardType(cleaned),
    };
  }

  /**
   * Validate expiry date
   */
  static validateExpiry(month, year) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return {
        valid: false,
        error: 'Invalid month (must be 1-12)',
      };
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return {
        valid: false,
        error: 'Card has expired',
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Validate CVV
   */
  static validateCVV(cvv, cardType = 'default') {
    const cvvLength = cardType === 'amex' ? 4 : 3;
    const regex = new RegExp(`^\\d{${cvvLength}}$`);

    if (!regex.test(cvv)) {
      return {
        valid: false,
        error: `Invalid CVV for ${cardType} (must be ${cvvLength} digits)`,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Validate complete card data
   */
  static validateCard(cardData) {
    const errors = [];

    // Validate card number
    const numberValidation = this.validateCardNumber(cardData.number);
    if (!numberValidation.valid) {
      errors.push(numberValidation.error);
    }

    // Validate expiry
    const expiryValidation = this.validateExpiry(
      cardData.expiry_month,
      cardData.expiry_year
    );
    if (!expiryValidation.valid) {
      errors.push(expiryValidation.error);
    }

    // Validate CVV
    const cardType = this.getCardType(cardData.number);
    const cvvValidation = this.validateCVV(cardData.cvv, cardType);
    if (!cvvValidation.valid) {
      errors.push(cvvValidation.error);
    }

    // Validate cardholder name
    if (!cardData.cardholder_name || cardData.cardholder_name.trim().length === 0) {
      errors.push('Cardholder name is required');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors,
      };
    }

    return {
      valid: true,
      cardType: cardType,
    };
  }

  /**
   * Detect card type from number
   */
  static getCardType(cardNumber) {
    const cleaned = cardNumber.replace(/\s+/g, '');

    // Visa
    if (/^4[0-9]{12}(?:[0-9]{3})?$/.test(cleaned)) {
      return 'visa';
    }

    // Mastercard
    if (/^5[1-5][0-9]{14}$/.test(cleaned)) {
      return 'mastercard';
    }

    // American Express
    if (/^3[47][0-9]{13}$/.test(cleaned)) {
      return 'amex';
    }

    // Diners Club
    if (/^3(?:0[0-5]|[68][0-9])[0-9]{11}$/.test(cleaned)) {
      return 'diners';
    }

    // Discover
    if (/^6(?:011|5[0-9]{2})[0-9]{12}$/.test(cleaned)) {
      return 'discover';
    }

    return 'unknown';
  }

  /**
   * Mask card number for display (show last 4 digits)
   */
  static maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s+/g, '');
    const lastFour = cleaned.slice(-4);
    return `****-****-****-${lastFour}`;
  }

  /**
   * Get last 4 digits of card
   */
  static getLastFour(cardNumber) {
    const cleaned = cardNumber.replace(/\s+/g, '');
    return cleaned.slice(-4);
  }
}

module.exports = CardValidationService;
