import { Resolver, Args, Query, Mutation } from "@nestjs/graphql";
import {
  Ctx,
  ID,
  Product,
  ProductVariant,
  RequestContext,
} from "@vendure/core";
import { QuestionAdminService } from "../../service/admin.service";

interface answerDto {
  id: ID;
  answer: string;
}

interface updateAnswerDto {
  id: ID;
  answerId: ID;
  answer: string;
}

@Resolver()
export class QuestionAdminResolver {
  constructor(private readonly questionService: QuestionAdminService) {}

  @Mutation()
  async createAnswer(
    @Ctx() ctx: RequestContext,
    @Args("input")
    input: answerDto,
  ) {
    try {
      return this.questionService.addAnswer(ctx, input);
    } catch (error) {
      error instanceof Error ? console.log(error.message) : console.log(error);
    }
  }

  @Mutation()
  async updateAnswer(
    @Ctx() ctx: RequestContext,
    @Args("input") input: updateAnswerDto,
  ) {
    try {
      return this.questionService.editAnswer(ctx, input);
    } catch (error) {
      error instanceof Error ? console.log(error.message) : console.log(error);
    }
  }

  @Mutation()
  async deleteAnswer(@Ctx() ctx: RequestContext, @Args("id") id: ID) {
    return this.questionService.deleteAnswer(ctx, id);
  }
}
