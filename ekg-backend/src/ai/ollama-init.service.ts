/**
 * @fileoverview Ollama Initialization Service - Auto Setup
 * @module ai/ollama-init.service
 *
 * Service tự động kiểm tra, khởi động, và cấu hình Ollama khi startup.
 * Hỗ trợ auto-start qua Docker nếu Ollama chưa chạy.
 *
 * Workflow:
 * 1. Kiểm tra Ollama đang chạy không
 * 2. Nếu chưa -> thử auto-start qua Docker
 * 3. Kiểm tra model đã được pull chưa
 * 4. Nếu chưa -> tự động pull model
 *
 * @author APTX3107 Team
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { execSync } from 'child_process';

/**
 * Service tự động khởi tạo Ollama trên startup.
 * Implements OnModuleInit để chạy khi module được load.
 */
@Injectable()
export class OllamaInitService implements OnModuleInit {
  private readonly logger = new Logger(OllamaInitService.name);

  /** URL của Ollama server */
  private readonly ollamaUrl =
    process.env.OLLAMA_URL || 'http://localhost:11434';

  /** Model cần sử dụng */
  private readonly ollamaModel = process.env.OLLAMA_MODEL || 'mistral';

  /**
   * Lifecycle hook chạy khi module được init.
   * Tự động setup Ollama.
   */
  async onModuleInit() {
    this.logger.log('='.repeat(60));
    this.logger.log('🚀 Initializing Ollama...');
    this.logger.log('='.repeat(60));

    try {
      // Step 1: Check if Ollama is running
      const isRunning = await this.isOllamaRunning();

      if (!isRunning) {
        this.logger.warn('⚠️  Ollama is not running!');
        this.logger.log('Attempting to auto-start Ollama...');

        const started = await this.autoStartOllama();
        if (!started) {
          this.logger.error('❌ Failed to auto-start Ollama');
          this.logger.error('⚠️  MANUAL SETUP REQUIRED:');
          this.logger.error(
            '1. Install Docker: https://www.docker.com/products/docker-desktop',
          );
          this.logger.error(
            '2. Run: docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama',
          );
          this.logger.error(
            '3. Download model: docker exec ollama ollama pull mistral',
          );
          this.logger.error('4. Restart backend: npm run start:dev');
          return;
        }

        this.logger.log('✅ Ollama started successfully!');
        await this.waitForOllama(10);
      } else {
        this.logger.log('✅ Ollama is running!');
      }

      // Step 2: Check if model exists
      const hasModel = await this.hasModel();

      if (!hasModel) {
        this.logger.warn(`⚠️  Model '${this.ollamaModel}' not found`);
        this.logger.log(`Pulling model '${this.ollamaModel}'...`);

        const pulled = await this.pullModel();
        if (!pulled) {
          this.logger.error('❌ Failed to pull model');
          this.logger.error(
            `Manual pull: docker exec ollama ollama pull ${this.ollamaModel}`,
          );
          return;
        }

        this.logger.log(`✅ Model '${this.ollamaModel}' pulled successfully!`);
      } else {
        this.logger.log(`✅ Model '${this.ollamaModel}' is ready!`);
      }

      this.logger.log('='.repeat(60));
      this.logger.log('✅ Ollama is fully configured and ready!');
      this.logger.log('='.repeat(60));
    } catch (error) {
      this.logger.error(`⚠️  Ollama initialization warning: ${error}`);
      this.logger.warn(
        'Chat system will still work, but complex queries may be slower',
      );
    }
  }

  /**
   * Kiểm tra Ollama có đang chạy không.
   *
   * @returns true nếu server respond
   */
  private async isOllamaRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Thử auto-start Ollama qua Docker.
   * Kiểm tra container đã tồn tại chưa, nếu có thì start, nếu không thì tạo mới.
   *
   * @returns true nếu start thành công
   */
  private async autoStartOllama(): Promise<boolean> {
    try {
      // Check if Docker is available
      try {
        execSync('docker --version', { encoding: 'utf8' });
      } catch {
        this.logger.warn(
          'Docker not found. Please install Docker and start Ollama manually.',
        );
        return false;
      }

      // Check if ollama container already exists but is stopped
      try {
        const containers = execSync(
          'docker ps -a --filter name=ollama --format "{{.Names}}"',
          {
            encoding: 'utf8',
          },
        ).trim();

        if (containers) {
          this.logger.log('Found existing ollama container. Starting it...');
          execSync('docker start ollama', { encoding: 'utf8' });
          return true;
        }
      } catch (error) {
        // Container doesn't exist, continue to create new one
      }

      // Create and start new Ollama container
      this.logger.log('Creating new Ollama container...');
      execSync(
        'docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama',
        { encoding: 'utf8', stdio: 'pipe' },
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to auto-start Ollama: ${error}`);
      return false;
    }
  }

  /**
   * Đợi Ollama sẵn sàng với retry.
   *
   * @param maxAttempts - Số lần thử tối đa
   * @returns true nếu server sẵn sàng
   */
  private async waitForOllama(maxAttempts: number = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(`${this.ollamaUrl}/api/tags`, {
          timeout: 2000,
        });
        if (response.status === 200) {
          return true;
        }
      } catch {
        // Continue waiting
      }

      this.logger.log(`Waiting for Ollama... (${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Kiểm tra model đã được pull chưa.
   *
   * @returns true nếu model tồn tại
   */
  private async hasModel(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data?.models || [];
      return models.some(
        (m: any) =>
          m.name === this.ollamaModel ||
          m.name.startsWith(this.ollamaModel + ':'),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull model từ Ollama registry.
   *
   * @returns true nếu pull thành công
   */
  private async pullModel(): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/pull`,
        {
          name: this.ollamaModel,
          stream: false,
        },
        {
          timeout: 600000, // 10 minutes
        },
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to pull model: ${error}`);
      return false;
    }
  }
}
