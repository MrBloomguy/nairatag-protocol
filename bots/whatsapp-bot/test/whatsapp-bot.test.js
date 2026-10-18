import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWhatsAppCommand } from '../src/command-parser.js';
import { WhatsAppBotService } from '../src/whatsapp-bot-service.js';

describe('NairaTag WhatsApp Bot', () => {
  describe('Command Parser', () => {
    it('parses send, tip, and check commands correctly', () => {
      const sendCmd = parseWhatsAppCommand('send ₦5,000 to ₦MIKKI');
      assert.equal(sendCmd.type, 'send');
      assert.equal(sendCmd.amount, 5000);
      assert.equal(sendCmd.cleanRecipient, 'MIKKI');

      const tipCmd = parseWhatsAppCommand('tip ₦1,000 to ₦ASAKE');
      assert.equal(tipCmd.type, 'tip');
      assert.equal(tipCmd.amount, 1000);
      assert.equal(tipCmd.cleanRecipient, 'ASAKE');

      const checkCmd = parseWhatsAppCommand('check ₦SEGUN');
      assert.equal(checkCmd.type, 'check');
      assert.equal(checkCmd.cleanRecipient, 'SEGUN');
    });

    it('parses voucher and account intents', () => {
      const voucherCmd = parseWhatsAppCommand('my voucher');
      assert.equal(voucherCmd.type, 'voucher');

      const accountCmd = parseWhatsAppCommand('receive money');
      assert.equal(accountCmd.type, 'account');
    });

    it('detects natural NairaTags mentioned in conversation', () => {
      const naturalCmd = parseWhatsAppCommand('Hey please send the funds to ₦MIKKI for the groceries');
      assert.equal(naturalCmd.type, 'tags_detected');
      assert.equal(naturalCmd.tags[0].tag, 'MIKKI');
    });
  });

  describe('WhatsAppBotService', () => {
    const mockResolver = {
      checkAvailability: async (tag) => tag.toLowerCase() === 'unclaimedtag',
      getProfile: async (tag) => ({
        handle: tag,
        displayTag: `₦${tag.toUpperCase()}`,
        available: tag.toLowerCase() === 'unclaimedtag',
        owner: '0x1234567890123456789012345678901234567890',
        profileUrl: `https://nairatag.ng/profile?tag=${tag.toLowerCase()}`
      })
    };

    const mockVoucherEngine = {
      getUserVouchers: (user) => [
        {
          code: 'NT-WELCOME-5000',
          formattedFaceValue: '₦5,000',
          isAvailable: true,
          daysLeft: 30
        }
      ]
    };

    const mockVaService = {
      getVirtualAccount: (user) => ({
        status: 'ACTIVE',
        bankName: 'Wema Bank',
        accountNumber: '9920192837',
        accountName: 'NairaTag · Mikki',
        nairatag: '₦MIKKI'
      })
    };

    const service = new WhatsAppBotService({
      resolver: mockResolver,
      voucherEngine: mockVoucherEngine,
      vaService: mockVaService,
      webBase: 'https://nairatag.ng',
      rateLimitPerMin: 5
    });

    it('responds to check command with availability & claim link', async () => {
      const res = await service.handleMessage({ sender: '+2348011111111', text: 'check ₦UNCLAIMEDTAG' });
      assert.equal(res.commandType, 'check');
      assert.equal(res.available, true);
      assert.match(res.claimUrl, /https:\/\/nairatag\.ng\/claim\?tag=UNCLAIMEDTAG&source=whatsapp/);
      assert.match(res.reply, /UNCLAIMEDTAG is available/i);
    });

    it('responds to send command with valid deep link', async () => {
      const res = await service.handleMessage({ sender: '+2348011111111', text: 'send ₦5,000 to ₦MIKKI' });
      assert.equal(res.commandType, 'send');
      assert.equal(res.amount, 5000);
      assert.match(res.payUrl, /https:\/\/nairatag\.ng\/pay\?tag=MIKKI&amount=5000&currency=NGN&source=whatsapp/);
    });

    it('returns active voucher on voucher intent', async () => {
      const res = await service.handleMessage({ sender: '+2348011111111', text: 'my voucher' });
      assert.equal(res.commandType, 'voucher');
      assert.match(res.reply, /NT-WELCOME-5000/);
    });

    it('returns active bank details on account intent', async () => {
      const res = await service.handleMessage({ sender: '+2348011111111', text: 'my account' });
      assert.equal(res.commandType, 'account');
      assert.match(res.reply, /9920192837/);
      assert.match(res.reply, /Wema Bank/);
    });

    it('handles natural tag mentions with action links', async () => {
      const res = await service.handleMessage({ sender: '+2348011111111', text: 'Hey please send to ₦MIKKI for lunch' });
      assert.equal(res.commandType, 'tag_detected');
      assert.match(res.payUrl, /tag=MIKKI/);
    });
  });
});
