import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

@Entity()
export class NewsletterSubscriber extends VendureEntity {
    constructor(input?: DeepPartial<NewsletterSubscriber>) {
        super(input);
    }

    @Column({ unique: true })
    email!: string;

    @Column({ nullable: true, type: 'varchar' })
    name: string | null = null;

    @Column({ nullable: true, type: 'varchar' })
    source: string | null = null;
}