import { Column, DeepPartial, Entity, Index, ManyToOne } from 'typeorm';
import { LanguageCode, Translation, VendureEntity } from '@vendure/core';
import { PageGroup } from './page-group.entity';

@Entity()
export class PageGroupTranslation extends VendureEntity implements Translation<PageGroup> {
    constructor(input?: DeepPartial<Translation<PageGroupTranslation>>) {
        super(input);
    }

    @Column('varchar')
    languageCode: LanguageCode;

    @Column()
    name: string;

    @Column()
    slug: string;

    @Index()
    @ManyToOne(() => PageGroup, base => base.translations, { onDelete: 'CASCADE' })
    base: PageGroup;
}
