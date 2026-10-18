import {
  Customer,
  DeepPartial,
  Product,
  ProductVariant,
  VendureEntity,
} from "@vendure/core";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { Answer } from "./answer.entity";

export class QuestionCustomFields {}

@Entity()
export class Question extends VendureEntity {
  constructor(input?: DeepPartial<Question>) {
    super(input);
  }

  @Column()
  question: string;

  @OneToOne(() => Answer, (answer) => answer.question)
  @JoinColumn()
  answer?: Answer;

  @ManyToOne(() => Product, { nullable: true })
  product?: Product;

  @ManyToOne(() => ProductVariant, { nullable: true })
  productVariant?: ProductVariant;

  @ManyToOne(() => Customer)
  askedBy: Customer;
}
