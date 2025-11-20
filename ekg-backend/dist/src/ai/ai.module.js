"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiModule = void 0;
const common_1 = require("@nestjs/common");
const query_classifier_service_1 = require("./query-classifier.service");
const ollama_service_1 = require("./ollama.service");
const chroma_db_service_1 = require("./chroma-db.service");
const gemini_service_1 = require("./gemini.service");
const ollama_init_service_1 = require("./ollama-init.service");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        providers: [
            query_classifier_service_1.QueryClassifierService,
            ollama_service_1.OllamaService,
            chroma_db_service_1.ChromaDBService,
            gemini_service_1.GeminiService,
            ollama_init_service_1.OllamaInitService,
        ],
        exports: [
            query_classifier_service_1.QueryClassifierService,
            ollama_service_1.OllamaService,
            chroma_db_service_1.ChromaDBService,
            gemini_service_1.GeminiService,
        ],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map