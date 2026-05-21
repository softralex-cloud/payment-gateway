const TronWeb = require('tronweb');

const TRON_PRIVATE_KEY = process.env.TRON_PRIVATE_KEY;
const TRON_ADDRESS = process.env.TRON_ADDRESS;
const TRON_NETWORK = process.env.TRON_NETWORK || 'mainnet';

// TRON network configuration
const TRON_CONFIG = {
  mainnet: {
    fullHost: 'https://api.tronstack.io',
  },
  testnet: {
    fullHost: 'https://api.shasta.tronstack.io',
  },
};

const tronWeb = new TronWeb({
  fullHost: TRON_CONFIG[TRON_NETWORK].fullHost,
  privateKey: TRON_PRIVATE_KEY,
});

// USDT Contract Address on TRON (TRC-20)
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q282JJUC56oysPmzJv';

class TronService {
  /**
   * Get TRON account info
   */
  static async getAccountInfo() {
    try {
      const address = tronWeb.address.fromPrivateKey(TRON_PRIVATE_KEY);
      const account = await tronWeb.trx.getAccount(address);
      return account;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Get TRX balance
   */
  static async getTRXBalance() {
    try {
      const balance = await tronWeb.trx.getBalance(TRON_ADDRESS);
      return balance / 1000000; // Convert from sun to TRX
    } catch (error) {
      throw new Error(`Failed to get TRX balance: ${error.message}`);
    }
  }

  /**
   * Get USDT balance
   */
  static async getUSDTBalance() {
    try {
      const contract = await tronWeb.contract().at(USDT_CONTRACT);
      const balance = await contract.balanceOf(TRON_ADDRESS).call();
      return balance.toNumber() / 1000000; // USDT has 6 decimals
    } catch (error) {
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
  }

  /**
   * Transfer USDT to address
   * @param {string} toAddress - Recipient address
   * @param {number} amount - Amount in USDT
   */
  static async transferUSDT(toAddress, amount) {
    try {
      // Validate address
      if (!tronWeb.isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Convert amount to contract units (6 decimals)
      const amountInUnits = Math.floor(amount * 1000000);

      // Create contract instance
      const contract = await tronWeb.contract().at(USDT_CONTRACT);

      // Send transaction
      const tx = await contract.transfer(toAddress, amountInUnits).send({
        feeLimit: 100000000, // 100 TRX
        callValue: 0,
      });

      return {
        txHash: tx,
        address: toAddress,
        amount: amount,
        status: 'pending',
      };
    } catch (error) {
      throw new Error(`Failed to transfer USDT: ${error.message}`);
    }
  }

  /**
   * Get transaction info
   */
  static async getTransactionInfo(txHash) {
    try {
      const info = await tronWeb.trx.getTransactionInfo(txHash);
      return info;
    } catch (error) {
      throw new Error(`Failed to get transaction info: ${error.message}`);
    }
  }

  /**
   * Convert USD to USDT (1:1 ratio since USDT is stablecoin)
   */
  static convertToUSDT(usdAmount) {
    return parseFloat(usdAmount.toFixed(6));
  }

  /**
   * Validate TRON address
   */
  static isValidAddress(address) {
    return tronWeb.isAddress(address);
  }
}

module.exports = TronService;
