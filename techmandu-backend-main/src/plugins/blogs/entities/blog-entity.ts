/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Channel,
  ChannelAware,
  DeepPartial,
  VendureEntity,
} from '@vendure/core';
import { Column, Entity, ManyToMany, JoinTable } from 'typeorm';

@Entity()
export class Blog extends VendureEntity implements ChannelAware {
  constructor(input?: DeepPartial<Blog>) {
    super(input);
  }

  @ManyToMany((type) => Channel)
  @JoinTable()
  channels: Channel[];

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column('text')
  content: string;

  @Column({ nullable: true, type: 'text' })
  metaTags: string;

  @Column({ nullable: true })
  metaTitle: string;

  @Column({ nullable: true })
  metaDescription: string;
}
