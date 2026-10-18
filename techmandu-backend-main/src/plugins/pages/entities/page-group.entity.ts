import { LocaleString, Translatable, Translation, VendureEntity } from '@vendure/core';
import { Column, DeepPartial, DeleteDateColumn, Entity, OneToMany } from 'typeorm';
import { PageGroupTranslation } from './page-group-translation.entity';
import { Page } from './page.entity';

@Entity()
export class PageGroup extends VendureEntity implements Translatable {
    constructor(input?: DeepPartial<PageGroup>) {
        super(input);
    }

    name: LocaleString;

    slug: LocaleString;

    @Column({ default: false })
    enabled: boolean;

    @DeleteDateColumn({ nullable: true })
    deletedAt: Date | null;

    @OneToMany(() => PageGroupTranslation, translation => translation.base, { eager: true })
    translations: Array<Translation<PageGroup>>;

    @OneToMany(() => Page, page => page.group)
    pages: Page[];
}
