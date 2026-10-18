import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ID, RequestContext, TransactionalConnection } from "@vendure/core";
import { Question } from "../entities/question.entity";
import { Answer } from "../entities/answer.entity";

interface AnswerInput {
  id: ID;
  answer: string;
}

interface AnswerUpdateInput {
  id: ID;
  answerId: ID;
  answer: string;
}

@Injectable()
export class QuestionAdminService {
  constructor(private connection: TransactionalConnection) {}

  async addAnswer(ctx: RequestContext, data: AnswerInput) {
    try {
      if (!data.id || !data.answer || data.answer.length === 0) {
        throw new BadRequestException("Answer cannot be left empty");
      }

      const questionExits = await this.questionExists(ctx, data.id);

      if (
        questionExits?.answer !== null &&
        questionExits?.answer?.text.length !== 0
      ) {
        throw new BadRequestException(
          "This question has already been answered",
        );
      }

      const newAnswer = await this.connection
        .getRepository(ctx, Answer)
        .save({ text: data.answer, question: questionExits });

      return newAnswer;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async editAnswer(ctx: RequestContext, data: AnswerUpdateInput) {
    try {
      if (!data.id || !data.answer || data.answer.length === 0) {
        throw new BadRequestException("Answer cannot be left empty");
      }

      const questionExits = await this.questionExists(ctx, data.id);

      await this.connection
        .getRepository(ctx, Answer)
        .update({ id: data.answerId }, { text: data.answer });

      const result = await this.connection.getRepository(ctx, Answer).findOne({
        where: {
          id: questionExits.answer?.id,
        },
        relations: ["question"],
      });

      return result;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async deleteAnswer(ctx: RequestContext, id: ID) {
    try {
      (await this.questionExists(ctx, id)) as Question;
      await this.connection.getRepository(ctx, Answer).delete({ id: id });
      return {
        success: true,
        message: "Answer deleted successfully",
      };
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async questionExists(ctx: RequestContext, id: ID) {
    try {
      const questionExists = await this.connection
        .getRepository(ctx, Question)
        .findOne({
          where: {
            id,
          },
          relations: ["answer"],
        });
      if (!questionExists) {
        throw new NotFoundException("No any question with such id found");
      }

      return questionExists;
    } catch (error: any) {
      throw new Error(error);
    }
  }
}
