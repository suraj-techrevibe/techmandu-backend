import { DeepPartial, VendureEntity, Asset } from "@vendure/core";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class Banner extends VendureEntity {
  constructor(input?: DeepPartial<Banner>) {
    super(input);
  }

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  ctaText: string;

  @Column()
  ctaLink: string;

  @ManyToOne(() => Asset)
  @JoinColumn()
  image: Asset;

  @Column({ default: 0 })
  price: number;
}
