import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
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

/**
 * Simple Vector Database using SQLite-like JSON storage
 * Lưu embedding của entities để semantic search
 * Mỗi collection là 1 file JSON
 */
@Injectable()
export class ChromaDBService implements OnModuleInit {
  private readonly logger = new Logger(ChromaDBService.name);
  private chromadbPath: string;
  private collections: Map<string, StoredVector[]> = new Map();
  private collectionFiles: Map<string, string> = new Map();

  constructor(private ollamaService: OllamaService) {
    this.chromadbPath =
      process.env.CHROMADB_PATH || path.join(process.cwd(), 'data', 'chromadb');
  }

  async onModuleInit() {
    try {
      // Tạo thư mục nếu chưa tồn tại
      if (!fs.existsSync(this.chromadbPath)) {
        fs.mkdirSync(this.chromadbPath, { recursive: true });
      }

      // Tạo collections cho các entity khác nhau
      await this.initializeCollections();
      this.logger.log(`ChromaDB initialized at ${this.chromadbPath}`);
    } catch (error) {
      this.logger.error(`Failed to initialize ChromaDB: ${error}`);
      throw error;
    }
  }

  /**
   * Khởi tạo collections
   */
  private async initializeCollections() {
    const collectionNames = ['employees', 'skills', 'departments', 'projects', 'positions', 'technologies'];

    for (const name of collectionNames) {
      const filePath = path.join(this.chromadbPath, `${name}.json`);
      this.collectionFiles.set(name, filePath);

      // Load existing data if exists
      if (fs.existsSync(filePath)) {
        try {
          const data = fs.readFileSync(filePath, 'utf-8');
          const vectors = JSON.parse(data);
          this.collections.set(name, vectors);
          this.logger.log(
            `Loaded ${vectors.length} vectors from ${name} collection`,
          );
        } catch (error) {
          this.logger.warn(`Could not load ${name} collection: ${error}`);
          this.collections.set(name, []);
        }
      } else {
        this.collections.set(name, []);
      }
    }
  }

  /**
   * Thêm document vào collection
   */
  async addDocuments(
    collectionName: string,
    documents: VectorDocument[],
  ): Promise<void> {
    try {
      if (!this.collections.has(collectionName)) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      const collection = this.collections.get(collectionName) || [];

      // Generate embeddings cho mỗi document
      for (const doc of documents) {
        try {
          const embedding =
            await this.ollamaService.generateEmbedding(doc.content);
          const vector: StoredVector = {
            id: doc.id,
            embedding,
            content: doc.content,
            metadata: doc.metadata,
          };

          // Thay thế nếu đã tồn tại, thêm mới nếu chưa
          const existingIndex = collection.findIndex((v) => v.id === doc.id);
          if (existingIndex >= 0) {
            collection[existingIndex] = vector;
          } else {
            collection.push(vector);
          }
        } catch (error) {
          this.logger.warn(
            `Failed to generate embedding for ${doc.id}: ${error}`,
          );
        }
      }

      // Lưu vào file
      await this.saveCollection(collectionName, collection);
      this.logger.log(
        `Added/updated ${documents.length} documents in ${collectionName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add documents to ${collectionName}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Tìm kiếm semantic trong collection
   */
  async search(
    collectionName: string,
    queryText: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      // Generate embedding cho query
      const queryEmbedding =
        await this.ollamaService.generateEmbedding(queryText);

      // Tính cosine similarity với tất cả vectors
      const scores = collection.map((vector) => ({
        id: vector.id,
        content: vector.content,
        metadata: vector.metadata,
        similarity: this.cosineSimilarity(queryEmbedding, vector.embedding),
      }));

      // Sort theo similarity và lấy top K
      const sorted = scores
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return sorted;
    } catch (error) {
      this.logger.error(`Failed to search in ${collectionName}: ${error}`);
      throw error;
    }
  }

  /**
   * Hybrid search: Vector search + keyword matching
   */
  async hybridSearch(
    collectionName: string,
    queryText: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    // Dùng vector search cho giờ
    return this.search(collectionName, queryText, topK);
  }

  /**
   * Xóa tất cả documents trong collection
   */
  async clearCollection(collectionName: string): Promise<void> {
    try {
      if (!this.collections.has(collectionName)) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      this.collections.set(collectionName, []);
      await this.saveCollection(collectionName, []);
      this.logger.log(`Cleared collection ${collectionName}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear collection ${collectionName}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Lưu collection vào file
   */
  private async saveCollection(
    collectionName: string,
    data: StoredVector[],
  ): Promise<void> {
    const filePath = this.collectionFiles.get(collectionName);
    if (!filePath) {
      throw new Error(`File path for ${collectionName} not found`);
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save collection ${collectionName}: ${error}`);
      throw error;
    }
  }

  /**
   * Tính cosine similarity giữa 2 vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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

  /**
   * Lấy collection
   */
  getCollection(collectionName: string) {
    return this.collections.get(collectionName);
  }

  /**
   * Lấy tất cả collections
   */
  getAllCollections() {
    return Array.from(this.collections.keys());
  }
}

