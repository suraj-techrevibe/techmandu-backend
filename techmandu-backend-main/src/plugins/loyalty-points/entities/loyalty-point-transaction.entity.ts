import { DeepPartial, ID, Order, Customer, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';

export enum TechCoinTransactionType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  REVERTED = 'REVERTED',
}

export enum TechCoinType {
  ORDER = 'ORDER',
  REGISTER = 'REGISTER',
}


@Entity()
export class TechCoinTransaction extends VendureEntity {
  constructor(input?: DeepPartial<TechCoinTransaction>) {
    super(input);
  }

  @ManyToOne(type => Customer)
  customer: Customer;

  @Column()
  customerId: ID;

  @ManyToOne(type => Order, { nullable: true })
  order: Order | null;

  @Column({ nullable: true })
  orderId: ID | null;

  @Column('int')
  points: number;

  @Column({
    type: 'varchar',
  })
  type: TechCoinTransactionType;

  @Column({
    type: 'varchar',
  })
  loyaltyPointsType: TechCoinType;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('varchar', { nullable: true })
  orderCode: string | null;
}
