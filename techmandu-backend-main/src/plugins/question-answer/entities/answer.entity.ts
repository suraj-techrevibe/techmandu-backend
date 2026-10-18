import { DeepPartial, VendureEntity } from "@vendure/core";
import { Column, Entity, OneToOne } from "typeorm";
import { Question } from "./question.entity";

export class AnswerCustomFields {}

@Entity()
export class Answer extends VendureEntity {
  constructor(input?: DeepPartial<Answer>) {
    super(input);
  }

  @Column()
  text: string;

  @OneToOne(() => Question, (question) => question.answer)
  question: Question;
}
