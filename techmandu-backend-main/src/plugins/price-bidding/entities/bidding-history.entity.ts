import {
    DeepPartial,
    HasCustomFields,
    VendureEntity,
    User
} from '@vendure/core';
import { Column, Entity,ManyToOne,JoinColumn } from 'typeorm';

@Entity()
export class BiddingHistory extends VendureEntity {
    constructor(input?: DeepPartial<BiddingHistory>) {
        super(input);
    }

    @Column()
    variantId: number;

    @Column('float')
    initialPrice: number;

    @Column('float')
    finalPrice: number;

    @Column({ default: false })
    isVerified: boolean;

    @ManyToOne(() => User)
    @JoinColumn()
    user: User; 
}
