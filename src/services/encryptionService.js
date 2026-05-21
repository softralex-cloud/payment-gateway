const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
}

class EncryptionService {
  /**
   * Encrypt card data using AES-256-CBC
   */
  static encryptCard(cardData) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY),
        iv
      );

      let encrypted = cipher.update(JSON.stringify(cardData), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt card data
   */
  static decryptCard(encryptedData, iv) {
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY),
        Buffer.from(iv, 'hex')
      );

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate random token
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash sensitive data (one-way)
   */
  static hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = EncryptionService;
