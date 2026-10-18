import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

export class PaymentGatewayTransactionsCustomFields {}

@Entity()
export class PaymentGatewayTransactions extends VendureEntity {
    constructor(input?: DeepPartial<PaymentGatewayTransactions>) {
        super(input);
    }

    @Column({ type: 'varchar', nullable: true })
    paymentMethod: string | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    totalTransactionAmount: string | null;

    @Column({ type: 'varchar', nullable: true })
    transactionId: string | null;

    @Column({ type: 'varchar', nullable: true })
    orderId: string | null;

    @Column({ type: 'boolean', default: false })
    paymentSettled: boolean;
}
