import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, DeleteDateColumn, Entity } from 'typeorm';

@Entity()
export class Contact extends VendureEntity {
    constructor(input?: DeepPartial<Contact>) {
        super(input);
    }

    @DeleteDateColumn({ nullable: true })
    deletedAt: Date | null;

    @Column()
    name: string;

    @Column()
    emailAddress: string;

    @Column()
    phone: string;

    @Column()
    subject: string;

    @Column('text')
    message: string;
}
