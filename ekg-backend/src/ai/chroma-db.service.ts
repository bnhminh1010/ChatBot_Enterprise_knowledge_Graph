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
    const collectionNames = [
      'employees',
      'skills',
      'departments',
      'projects',
      'positions',
      'technologies',
      'documents',
    ];

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
          const embedding = await this.ollamaService.generateEmbedding(
            doc.content,
          );
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
      // Lazy load collection if not in memory
      const collection = await this.ensureCollectionLoaded(collectionName);
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
   * Combines semantic similarity with keyword relevance
   */
  async hybridSearch(
    collectionName: string,
    queryText: string,
    topK: number = 5,
    options?: {
      vectorWeight?: number;
      keywordWeight?: number;
      filters?: Record<string, any>;
    },
  ): Promise<SearchResult[]> {
    try {
      const collection = this.collections.get(collectionName);
      if (!collection) {
        throw new Error(`Collection ${collectionName} not found`);
      }

      // Default weights
      const vectorWeight = options?.vectorWeight ?? 0.7;
      const keywordWeight = options?.keywordWeight ?? 0.3;

      // Step 1: Get vector similarity scores
      const queryEmbedding =
        await this.ollamaService.generateEmbedding(queryText);

      const vectorScores = collection.map((vector) => ({
        id: vector.id,
        content: vector.content,
        metadata: vector.metadata,
        vectorScore: this.cosineSimilarity(queryEmbedding, vector.embedding),
      }));

      // Step 2: Calculate keyword relevance scores (BM25-like)
      const queryKeywords = this.extractKeywords(queryText);
      const keywordScores = vectorScores.map((item) => {
        const contentKeywords = this.extractKeywords(item.content);
        const keywordScore = this.calculateKeywordRelevance(
          queryKeywords,
          contentKeywords,
          item.content,
        );
        return {
          ...item,
          keywordScore,
        };
      });

      // Step 3: Apply metadata filters if provided
      let filtered = keywordScores;
      if (options?.filters) {
        filtered = keywordScores.filter((item) =>
          this.matchesFilters(item.metadata, options.filters!),
        );
      }

      // Step 4: Combine scores with weights
      const hybridScores = filtered.map((item) => ({
        id: item.id,
        content: item.content,
        metadata: item.metadata,
        similarity:
          vectorWeight * item.vectorScore + keywordWeight * item.keywordScore,
      }));

      // Step 5: Sort and return top-K
      const sorted = hybridScores
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      this.logger.debug(
        `Hybrid search in ${collectionName}: ${sorted.length} results (vector: ${vectorWeight}, keyword: ${keywordWeight})`,
      );

      return sorted;
    } catch (error) {
      this.logger.error(
        `Failed to perform hybrid search in ${collectionName}: ${error}`,
      );
      // Fallback to pure vector search
      return this.search(collectionName, queryText, topK);
    }
  }

  /**
   * Extract keywords from text (simple tokenization)
   */
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2); // Filter short words
  }

  /**
   * Calculate keyword relevance score (BM25-like)
   * Simple implementation: TF (term frequency) with length normalization
   */
  private calculateKeywordRelevance(
    queryKeywords: string[],
    contentKeywords: string[],
    content: string,
  ): number {
    if (queryKeywords.length === 0) return 0;

    let score = 0;
    const contentLength = contentKeywords.length;

    for (const qKeyword of queryKeywords) {
      // Count occurrences in content
      const tf = contentKeywords.filter((k) => k === qKeyword).length;

      if (tf > 0) {
        // TF with diminishing returns (log normalization)
        const normalizedTF = Math.log(1 + tf);
        // Length normalization (shorter documents get slight boost)
        const lengthNorm = 1 / Math.sqrt(contentLength || 1);
        score += normalizedTF * lengthNorm;
      }
    }

    // Normalize by number of query keywords
    return score / Math.sqrt(queryKeywords.length);
  }

  /**
   * Check if metadata matches filters
   */
  private matchesFilters(
    metadata: Record<string, any>,
    filters: Record<string, any>,
  ): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        // If filter value is array, check if metadata value is in array
        if (!value.includes(metadata[key])) {
          return false;
        }
      } else {
        // Exact match or substring match for strings
        const metaValue = metadata[key];
        if (typeof value === 'string' && typeof metaValue === 'string') {
          if (!metaValue.toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
        } else if (metaValue !== value) {
          return false;
        }
      }
    }
    return true;
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
      this.logger.error(
        `Failed to save collection ${collectionName}: ${error}`,
      );
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
   * Ensure collection is loaded (lazy loading support)
   */
  private async ensureCollectionLoaded(
    collectionName: string,
  ): Promise<StoredVector[] | null> {
    // Check if collection is in memory
    if (this.collections.has(collectionName)) {
      return this.collections.get(collectionName)!;
    }

    // Check if lazy loading is disabled (load all on init)
    const lazyLoad = process.env.CHROMADB_LAZY_LOAD === 'true';
    if (!lazyLoad) {
      return null;
    }

    // Try to load from file
    const filePath = this.collectionFiles.get(collectionName);
    if (!filePath || !fs.existsSync(filePath)) {
      return null;
    }

    try {
      this.logger.log(`Lazy loading collection: ${collectionName}`);
      const data = fs.readFileSync(filePath, 'utf-8');
      const vectors = JSON.parse(data);
      this.collections.set(collectionName, vectors);
      return vectors;
    } catch (error) {
      this.logger.warn(
        `Could not lazy load ${collectionName}: ${error.message}`,
      );
      return null;
    }
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
