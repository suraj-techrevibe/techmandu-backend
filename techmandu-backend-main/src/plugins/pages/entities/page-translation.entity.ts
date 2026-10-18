import { Column, DeepPartial, Entity, Index, ManyToOne } from 'typeorm';
import { LanguageCode, Translation, VendureEntity } from '@vendure/core';
import { Page } from './page.entity';

@Entity()
export class PageTranslation extends VendureEntity implements Translation<Page> {
    constructor(input?: DeepPartial<Translation<PageTranslation>>) {
        super(input);
    }

    @Column('varchar')
    languageCode: LanguageCode;

    @Column()
    title: string;

    @Column()
    slug: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ nullable: true, type: 'text' })
    metaKeywords: string;

    @Column({ nullable: true })
    metaTitle: string;

    @Column({ nullable: true })
    metaDescription: string;

    @Index()
    @ManyToOne(type => Page, base => base.translations, { onDelete: 'CASCADE' })
    base: Page;
}
