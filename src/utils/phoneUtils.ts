// utils/phoneUtils.ts

export class LaoPhoneUtil {
  /**
   * แปลงเบอร์ลาวทุกรูปแบบให้เป็น +85620xxxxxxx
   */
  static normalize(phone: string): string | null {
    if (!phone) return null;

    // ลบช่องว่าง, -, (), . ฯลฯ
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('020') && cleaned.length === 11) {
      return `+856${cleaned.slice(1)}`; // 020 → +85620
    } else if (cleaned.startsWith('85620') && cleaned.length === 12) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('20') && cleaned.length === 10) {
      return `+856${cleaned}`;
    }

    return null; // ไม่ใช่เบอร์ลาวที่ถูกต้อง
  }

  /**
   * ตรวจสอบว่าเป็นเบอร์ลาวหรือไม่
   */
  static isValid(phone: string): boolean {
    return this.normalize(phone) !== null;
  }

  /**
   * เปรียบเทียบสองเบอร์ว่าตรงกันหรือไม่ (แม้รูปแบบต่างกัน)
   */
  static isEqual(phone1: string, phone2: string): boolean {
    const n1 = this.normalize(phone1);
    const n2 = this.normalize(phone2);
    return n1 === n2 && n1 !== null;
  }
}