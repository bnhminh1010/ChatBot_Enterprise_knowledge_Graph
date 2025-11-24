import { OnModuleInit } from '@nestjs/common';
import { OllamaService } from './ollama.service';
export interface VectorDocument {
    id: string;
    content: string;
    metadata: Record<string, any>;
}
export interface SearchResult {
    id: string;
    content: string;
    metadata: Record<string, any>;
    similarity: number;
}
interface StoredVector {
    id: string;
    embedding: number[];
    content: string;
    metadata: Record<string, any>;
}
export declare class ChromaDBService implements OnModuleInit {
    private ollamaService;
    private readonly logger;
    private chromadbPath;
    private collections;
    private collectionFiles;
    constructor(ollamaService: OllamaService);
    onModuleInit(): Promise<void>;
    private initializeCollections;
    addDocuments(collectionName: string, documents: VectorDocument[]): Promise<void>;
    search(collectionName: string, queryText: string, topK?: number): Promise<SearchResult[]>;
    hybridSearch(collectionName: string, queryText: string, topK?: number): Promise<SearchResult[]>;
    clearCollection(collectionName: string): Promise<void>;
    private saveCollection;
    private cosineSimilarity;
    getCollection(collectionName: string): StoredVector[] | undefined;
    getAllCollections(): string[];
}
export {};
