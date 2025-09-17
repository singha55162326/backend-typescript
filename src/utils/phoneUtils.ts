// src/utils/phoneUtils.ts

export class LaoPhoneUtil {
  /**
   * Normalize Lao phone number to +85620xxxxxxx
   * Accepts:
   *   "02012345678" → 11 digits
   *   "2012345678"  → 10 digits
   *   "8562012345678" → 13 digits (assumes missing +)
   *   "+8562012345678" → will be cleaned to 8562012345678 (13) then processed
   */
  static normalize(phone: string): string | null {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Case 1: Starts with 020 and 11 digits total
    if (cleaned.startsWith('020') && cleaned.length === 11) {
      return '+856' + cleaned.substring(1); // Remove leading 0 → 2012345678
    }

    // Case 2: Starts with 20 and 10 digits total
    if (cleaned.startsWith('20') && cleaned.length === 10) {
      return '+856' + cleaned;
    }

    // Case 3: Starts with 85620 and 13 digits total (e.g., user typed +85620... but + was stripped)
    if (cleaned.startsWith('85620') && cleaned.length === 13) {
      return '+' + cleaned;
    }

    // Case 4: Starts with 85620 and 12 digits (e.g., 856201234567)
    if (cleaned.startsWith('85620') && cleaned.length === 12) {
      return '+' + cleaned;
    }

    return null;
  }

  static isValid(phone: string): boolean {
    return this.normalize(phone) !== null;
  }

  static isEqual(phone1: string, phone2: string): boolean {
    const n1 = this.normalize(phone1);
    const n2 = this.normalize(phone2);
    return n1 === n2 && n1 !== null;
  }
}