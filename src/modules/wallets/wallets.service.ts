import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionType, TransactionStatus } from '../../common/enums';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async createWallet(userId: string): Promise<Wallet> {
    const wallet = this.walletRepo.create({ userId, balance: 0, lockedBalance: 0 });
    return this.walletRepo.save(wallet);
  }

  async getWallet(userId: string) {
    const wallet = await this.walletRepo.findOne({
      where: { userId },
      relations: ['transactions'],
    });
    if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
    return {
      ...wallet,
      availableBalance: wallet.availableBalance,
      transactions: wallet.transactions?.slice(0, 20),
    };
  }

  async deposit(userId: string, amount: number, description?: string) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

      wallet.balance = Number(wallet.balance) + amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.DEPOSIT,
        amount,
        status: TransactionStatus.COMPLETED,
        description: description ?? 'إيداع في المحفظة',
      });
      await manager.save(transaction);

      return { wallet, transaction };
    });
  }

  async withdraw(userId: string, amount: number) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

      if (wallet.availableBalance < amount) {
        throw new BadRequestException('الرصيد المتاح غير كافٍ');
      }

      wallet.balance = Number(wallet.balance) - amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.WITHDRAWAL,
        amount,
        status: TransactionStatus.COMPLETED,
        description: 'سحب من المحفظة',
      });
      await manager.save(transaction);

      return { wallet, transaction };
    });
  }

  async lockDeposit(userId: string, amount: number, auctionId: string) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      if (!wallet) throw new NotFoundException('المحفظة غير موجودة');

      if (wallet.availableBalance < amount) {
        throw new BadRequestException(
          `الرصيد المتاح (${wallet.availableBalance} ر.س) أقل من الوديعة المطلوبة (${amount} ر.س)`,
        );
      }

      wallet.lockedBalance = Number(wallet.lockedBalance) + amount;
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.BID_LOCK,
        amount,
        status: TransactionStatus.COMPLETED,
        description: `وديعة مزاد ${auctionId}`,
        referenceId: auctionId,
        referenceType: 'auction',
      });
      await manager.save(transaction);

      return wallet;
    });
  }

  async releaseDeposit(userId: string, amount: number, auctionId: string) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      if (!wallet) return;

      wallet.lockedBalance = Math.max(0, Number(wallet.lockedBalance) - amount);
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.BID_RELEASE,
        amount,
        status: TransactionStatus.COMPLETED,
        description: `إطلاق وديعة مزاد ${auctionId}`,
        referenceId: auctionId,
        referenceType: 'auction',
      });
      await manager.save(transaction);
    });
  }

  async chargeWinnerPayment(
    userId: string,
    totalAmount: number,
    depositLocked: number,
    auctionId: string,
    auctionTitle: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, { where: { userId } });
      if (!wallet) throw new NotFoundException('محفظة الفائز غير موجودة');

      const remaining = totalAmount - depositLocked;
      if (wallet.availableBalance < remaining) {
        throw new BadRequestException(
          `رصيد الفائز غير كافٍ. المطلوب: ${totalAmount} ر.س (الوديعة ${depositLocked} ر.س + ${remaining} ر.س)`,
        );
      }

      wallet.balance = Number(wallet.balance) - totalAmount;
      wallet.lockedBalance = Math.max(0, Number(wallet.lockedBalance) - depositLocked);
      await manager.save(wallet);

      const transaction = manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.PAYMENT,
        amount: totalAmount,
        status: TransactionStatus.COMPLETED,
        description: `شراء مزاد: ${auctionTitle}`,
        referenceId: auctionId,
        referenceType: 'auction',
      });
      await manager.save(transaction);

      return wallet;
    });
  }

  async canAffordWinnerPayment(
    userId: string,
    totalAmount: number,
    depositLocked: number,
  ): Promise<boolean> {
    const wallet = await this.walletRepo.findOne({ where: { userId } });
    if (!wallet) return false;
    const remaining = totalAmount - depositLocked;
    return wallet.availableBalance >= remaining;
  }
}
