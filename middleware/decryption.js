<<<<<<< Updated upstream
=======
/**
 * Decryption Middleware
 * 
 * This module provides AES-256-CBC decryption functionality for the
 * travel request system. It handles secure decryption of sensitive
 * data that has been encrypted before storage or transmission.
 */

>>>>>>> Stashed changes
import crypto from 'crypto';
const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

export const decrypt = (encryptedData) => {
  try {
    // If the input is not a string or is empty, return it as is (not encrypted)
    if (!encryptedData || typeof encryptedData !== 'string') {
      return encryptedData; 
    }

    const IV = Buffer.from(encryptedData.slice(0, 32), 'hex');
    const cipherText = encryptedData.slice(32);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(AES_SECRET_KEY), IV);
    let decrypted = decipher.update(cipherText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData; 
  }
}
