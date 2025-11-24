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
const ollama_service_1 = require("./ollama.service");
const gemini_service_1 = require("./gemini.service");
const query_classifier_service_1 = require("./query-classifier.service");
const chroma_db_service_1 = require("./chroma-db.service");
const neo4j_module_1 = require("../core/neo4j/neo4j.module");
let AiModule = class AiModule {
};
exports.AiModule = AiModule;
exports.AiModule = AiModule = __decorate([
    (0, common_1.Module)({
        imports: [neo4j_module_1.Neo4jModule],
        providers: [
            ollama_service_1.OllamaService,
            gemini_service_1.GeminiService,
            query_classifier_service_1.QueryClassifierService,
            chroma_db_service_1.ChromaDBService,
        ],
        exports: [
            ollama_service_1.OllamaService,
            gemini_service_1.GeminiService,
            query_classifier_service_1.QueryClassifierService,
            chroma_db_service_1.ChromaDBService,
        ],
    })
], AiModule);
//# sourceMappingURL=ai.module.js.map