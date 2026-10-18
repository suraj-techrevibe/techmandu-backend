import { PluginCommonModule, Type, VendurePlugin } from "@vendure/core";

import { QUESTION_ANSWER_PLUGIN_OPTIONS } from "./constants";
import { PluginInitOptions } from "./types";
import { Question } from "./entities/question.entity";
import { QuestionShopService } from "./service/shop.service";
import { questionShopApiExtension } from "./api/shop-api.extension";
import { QuestionShopResolver } from "./api/resolver/shop.resolver";
import { questionAdminApiExtension } from "./api/admin-api.extension";
import { QuestionAdminResolver } from "./api/resolver/admin.resolver";
import { QuestionAdminService } from "./service/admin.service";
import { Answer } from "./entities/answer.entity";

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [QuestionShopService, QuestionAdminService],
  shopApiExtensions: {
    schema: questionShopApiExtension,
    resolvers: [QuestionShopResolver],
  },
  adminApiExtensions: {
    schema: questionAdminApiExtension,
    resolvers: [QuestionAdminResolver],
  },
  configuration: (config) => {
    return config;
  },
  compatibility: "^3.0.0",
  entities: [Question, Answer],
})
export class QuestionAnswerPlugin {
  static options: PluginInitOptions;

  static init(options: PluginInitOptions): Type<QuestionAnswerPlugin> {
    this.options = options;
    return QuestionAnswerPlugin;
  }
}
