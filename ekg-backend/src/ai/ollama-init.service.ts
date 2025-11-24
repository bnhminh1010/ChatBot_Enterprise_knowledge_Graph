import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { execSync } from 'child_process';

/**
 * Ollama Initialization Service
 * Automatically checks, starts, and configures Ollama on startup
 */
@Injectable()
export class OllamaInitService implements OnModuleInit {
  private readonly logger = new Logger(OllamaInitService.name);
  private readonly ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  private readonly ollamaModel = process.env.OLLAMA_MODEL || 'mistral';

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
          this.logger.error('1. Install Docker: https://www.docker.com/products/docker-desktop');
          this.logger.error('2. Run: docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama');
          this.logger.error('3. Download model: docker exec ollama ollama pull mistral');
          this.logger.error('4. Restart backend: npm run start:dev');
          return;
        }

        this.logger.log('✅ Ollama started successfully!');
        // Wait for Ollama to be ready
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
          this.logger.error(`Manual pull: docker exec ollama ollama pull ${this.ollamaModel}`);
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
      this.logger.warn('Chat system will still work, but complex queries may be slower');
    }
  }

  /**
   * Check if Ollama is running
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
   * Attempt to auto-start Ollama via Docker
   */
  private async autoStartOllama(): Promise<boolean> {
    try {
      // Check if Docker is available
      try {
        execSync('docker --version', { encoding: 'utf8' });
      } catch {
        this.logger.warn('Docker not found. Please install Docker and start Ollama manually.');
        return false;
      }

      // Check if ollama container already exists but is stopped
      try {
        const containers = execSync('docker ps -a --filter name=ollama --format "{{.Names}}"', {
          encoding: 'utf8',
        }).trim();

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
   * Wait for Ollama to be ready
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
   * Check if model exists
   */
  private async hasModel(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data?.models || [];
      return models.some(
        (m: any) =>
          m.name === this.ollamaModel || m.name.startsWith(this.ollamaModel + ':'),
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull model from Ollama
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
