import { Resolver, Args, Query, Mutation } from "@nestjs/graphql";
import {
  Ctx,
  ID,
  Product,
  ProductVariant,
  RequestContext,
} from "@vendure/core";
import { QuestionShopService } from "../../service/shop.service";

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

@Resolver()
export class QuestionShopResolver {
  constructor(private readonly questionService: QuestionShopService) {}

  @Query()
  async questionForProduct(@Ctx() ctx: RequestContext, @Args("id") id: ID) {
    try {
      return this.questionService.fetchQuestionForProduct(ctx, id);
    } catch (error) {
      error instanceof Error ? console.log(error.message) : console.log(error);
    }
  }

  @Query()
  async questionForVariant(@Ctx() ctx: RequestContext, @Args("id") id: ID) {
    try {
      return this.questionService.fetchQuestionForVariant(ctx, id);
    } catch (error) {
      error instanceof Error ? console.log(error.message) : console.log(error);
    }
  }

  @Mutation()
  async createQuestion(
    @Ctx() ctx: RequestContext,
    @Args("input")
    input: questionDto,
  ) {
    try {
      return this.questionService.addQuestion(ctx, input);
    } catch (error) {
      error instanceof Error ? console.log(error.message) : console.log(error);
    }
  }

  @Mutation()
  async updateQuestion(
    @Ctx() ctx: RequestContext,
    @Args("input") input: editQuestionDto,
  ) {
    try {
      return this.questionService.editQuestion(ctx, input);
    } catch (error) {
      error instanceof Error ? console.log(error.message) : console.log(error);
    }
  }

  @Mutation()
  async deleteQuestion(@Ctx() ctx: RequestContext, @Args("id") id: ID) {
    return this.questionService.deleteQuestion(ctx, id);
  }
}
