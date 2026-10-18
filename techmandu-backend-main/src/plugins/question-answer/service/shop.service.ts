import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  TransactionalConnection,
  RequestContext,
  ID,
  Product,
  ProductVariant,
  Customer,
} from "@vendure/core";
import { Question } from "../entities/question.entity";

interface questionDto {
  question: string;
  product?: Product;
  productVariant?: ProductVariant;
}

interface editQuestionDto {
  id: ID;
  question?: string;
  product?: Product;
  productVariant?: ProductVariant;
}

@Injectable()
export class QuestionShopService {
  constructor(private connection: TransactionalConnection) {}

  async fetchQuestionForProduct(ctx: RequestContext, id: ID) {
    try {
      const questions = await this.connection
        .getRepository(ctx, Question)
        .find({
          relations: ["product", "askedBy"],
        });
      if (!questions)
        throw new NotFoundException("No any questions found for this product");

      return questions.filter((ques) => {
        if (ques.product && ques.product.id === id) return ques;
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async fetchQuestionForVariant(ctx: RequestContext, id: ID) {
    try {
      const questions = await this.connection
        .getRepository(ctx, Question)
        .find({
          relations: ["productVariant", "askedBy"],
        });
      if (!questions)
        throw new NotFoundException("No any questions found for this variant");

      return questions.filter((ques) => {
        if (ques.product && ques.product.id === id) return ques;
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async addQuestion(ctx: RequestContext, data: questionDto) {
    try {
      if (!ctx.activeUserId) {
        throw new UnauthorizedException();
      }

      const activeUser = await this.connection
        .getRepository(ctx, Customer)
        .findOne({
          where: {
            id: ctx.activeUserId,
          },
        });

      if (!activeUser) throw new NotFoundException("Customer not found");

      if (!data.product && !data.productVariant) {
        throw new BadRequestException(
          "A question must be related to a Product or its Variant",
        );
      }

      const newQuestion = await this.connection
        .getRepository(ctx, Question)
        .save({
          question: data.question,
          ...(data.product && { product: data.product }),
          ...(data.productVariant && { productVariant: data.productVariant }),
          askedBy: activeUser,
        });
      return newQuestion;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async editQuestion(ctx: RequestContext, data: editQuestionDto) {
    try {
      if (!ctx.activeUserId) {
        throw new UnauthorizedException();
      }

      const questionExists = (await this.questionExists(
        ctx,
        data.id,
      )) as Question;
      let fieldsToUpdate: Record<string, any> = {};
      if (data.question) fieldsToUpdate.question = data.question;
      if (data.product) fieldsToUpdate.product = data.product;
      if (data.productVariant)
        fieldsToUpdate.productVariant = data.productVariant;
      const result = await this.connection
        .getRepository(ctx, Question)
        .update(data.id, fieldsToUpdate);
      return this.connection.getRepository(ctx, Question).findOne({
        where: {
          id: data.id,
        },
      });
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async deleteQuestion(ctx: RequestContext, id: ID) {
    try {
      if (!ctx.activeUserId) {
        throw new UnauthorizedException();
      }

      (await this.questionExists(ctx, id)) as Question;
      this.connection.getRepository(ctx, Question).delete({
        id,
      });
      return {
        success: true,
        message: "Question deleted successfully",
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
