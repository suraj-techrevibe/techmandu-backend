import { Entity, OneToMany, ManyToMany, JoinTable, Column, DeleteDateColumn, ManyToOne } from 'typeorm';
import {
    Channel,
    ChannelAware,
    DeepPartial,
    LocaleString,
    Translatable,
    Translation,
    VendureEntity,
} from '@vendure/core';
import { PageTranslation } from './page-translation.entity';
import { PageGroup } from './page-group.entity';

@Entity()
export class Page extends VendureEntity implements Translatable, ChannelAware {
    constructor(input?: DeepPartial<Page>) {
        super(input);
    }

    @DeleteDateColumn({ nullable: true })
    deletedAt: Date | null;

    title: LocaleString;

    slug: LocaleString;

    metaTitle: LocaleString;

    metaKeywords: LocaleString;

    metaDescription: LocaleString;

    content: LocaleString;

    @OneToMany(type => PageTranslation, transaltion => transaltion.base, { eager: true })
    translations: Array<Translation<Page>>;

    @Column({ type: 'boolean' })
    enabled: boolean;

    @ManyToMany(type => Channel, channel => channel.facets)
    @JoinTable()
    channels: Channel[];

    @ManyToOne(() => PageGroup, group => group.pages, { nullable: true, onDelete: 'SET NULL' })
    group: PageGroup | null;
}
