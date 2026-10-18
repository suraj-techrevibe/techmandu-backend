import {
    DeepPartial,
    HasCustomFields,
    VendureEntity,
    Asset,
    
    
    
} from '@vendure/core';
import { Column, Entity,OneToOne,JoinColumn,ManyToOne,ManyToMany,JoinTable  } from 'typeorm';

export class SellerRegistrationCustomFields {}

@Entity()
export class SellerRegistration extends VendureEntity {
    constructor(input?: DeepPartial<SellerRegistration>) {
        super(input);
    }

    @Column({ type: 'varchar', nullable: true })
    panNo: string;

    @Column({ type: 'varchar', nullable: true })
    businessName: string;

    @Column({ type: 'varchar', nullable: true })
    businessRegistrationNo: string;

    @Column({ type: 'varchar', nullable: true })
    address: string;

    @Column({ type: 'varchar', nullable: true })
    ownerName: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string;

    @Column({ type: 'varchar', nullable: true })
    email: string;

    @Column({ type: 'boolean', nullable: true,default:false })
    isVerified: boolean;
    @ManyToOne(() => Asset, { nullable: true })
     @JoinColumn({ name: 'panPhotoId' })
    panPhoto: Asset;
    @ManyToMany(() => Asset)
    @JoinTable()
    documents: Asset[];
}
