"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChromaDBService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromaDBService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ollama_service_1 = require("./ollama.service");
let ChromaDBService = ChromaDBService_1 = class ChromaDBService {
    ollamaService;
    logger = new common_1.Logger(ChromaDBService_1.name);
    chromadbPath;
    collections = new Map();
    collectionFiles = new Map();
    constructor(ollamaService) {
        this.ollamaService = ollamaService;
        this.chromadbPath =
            process.env.CHROMADB_PATH || path.join(process.cwd(), 'data', 'chromadb');
    }
    async onModuleInit() {
        try {
            if (!fs.existsSync(this.chromadbPath)) {
                fs.mkdirSync(this.chromadbPath, { recursive: true });
            }
            await this.initializeCollections();
            this.logger.log(`ChromaDB initialized at ${this.chromadbPath}`);
        }
        catch (error) {
            this.logger.error(`Failed to initialize ChromaDB: ${error}`);
            throw error;
        }
    }
    async initializeCollections() {
        const collectionNames = ['employees', 'skills', 'departments', 'projects'];
        for (const name of collectionNames) {
            const filePath = path.join(this.chromadbPath, `${name}.json`);
            this.collectionFiles.set(name, filePath);
            if (fs.existsSync(filePath)) {
                try {
                    const data = fs.readFileSync(filePath, 'utf-8');
                    const vectors = JSON.parse(data);
                    this.collections.set(name, vectors);
                    this.logger.log(`Loaded ${vectors.length} vectors from ${name} collection`);
                }
                catch (error) {
                    this.logger.warn(`Could not load ${name} collection: ${error}`);
                    this.collections.set(name, []);
                }
            }
            else {
                this.collections.set(name, []);
            }
        }
    }
    async addDocuments(collectionName, documents) {
        try {
            if (!this.collections.has(collectionName)) {
                throw new Error(`Collection ${collectionName} not found`);
            }
            const collection = this.collections.get(collectionName) || [];
            for (const doc of documents) {
                try {
                    const embedding = await this.ollamaService.generateEmbedding(doc.content);
                    const vector = {
                        id: doc.id,
                        embedding,
                        content: doc.content,
                        metadata: doc.metadata,
                    };
                    const existingIndex = collection.findIndex((v) => v.id === doc.id);
                    if (existingIndex >= 0) {
                        collection[existingIndex] = vector;
                    }
                    else {
                        collection.push(vector);
                    }
                }
                catch (error) {
                    this.logger.warn(`Failed to generate embedding for ${doc.id}: ${error}`);
                }
            }
            await this.saveCollection(collectionName, collection);
            this.logger.log(`Added/updated ${documents.length} documents in ${collectionName}`);
        }
        catch (error) {
            this.logger.error(`Failed to add documents to ${collectionName}: ${error}`);
            throw error;
        }
    }
    async search(collectionName, queryText, topK = 5) {
        try {
            const collection = this.collections.get(collectionName);
            if (!collection) {
                throw new Error(`Collection ${collectionName} not found`);
            }
            const queryEmbedding = await this.ollamaService.generateEmbedding(queryText);
            const scores = collection.map((vector) => ({
                id: vector.id,
                content: vector.content,
                metadata: vector.metadata,
                similarity: this.cosineSimilarity(queryEmbedding, vector.embedding),
            }));
            const sorted = scores
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK);
            return sorted;
        }
        catch (error) {
            this.logger.error(`Failed to search in ${collectionName}: ${error}`);
            throw error;
        }
    }
    async hybridSearch(collectionName, queryText, topK = 5) {
        return this.search(collectionName, queryText, topK);
    }
    async clearCollection(collectionName) {
        try {
            if (!this.collections.has(collectionName)) {
                throw new Error(`Collection ${collectionName} not found`);
            }
            this.collections.set(collectionName, []);
            await this.saveCollection(collectionName, []);
            this.logger.log(`Cleared collection ${collectionName}`);
        }
        catch (error) {
            this.logger.error(`Failed to clear collection ${collectionName}: ${error}`);
            throw error;
        }
    }
    async saveCollection(collectionName, data) {
        const filePath = this.collectionFiles.get(collectionName);
        if (!filePath) {
            throw new Error(`File path for ${collectionName} not found`);
        }
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            this.logger.error(`Failed to save collection ${collectionName}: ${error}`);
            throw error;
        }
    }
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    getCollection(collectionName) {
        return this.collections.get(collectionName);
    }
    getAllCollections() {
        return Array.from(this.collections.keys());
    }
};
exports.ChromaDBService = ChromaDBService;
exports.ChromaDBService = ChromaDBService = ChromaDBService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ollama_service_1.OllamaService])
], ChromaDBService);
//# sourceMappingURL=chroma-db.service.js.map