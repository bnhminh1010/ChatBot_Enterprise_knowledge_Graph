"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OllamaInitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaInitService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
let OllamaInitService = OllamaInitService_1 = class OllamaInitService {
    logger = new common_1.Logger(OllamaInitService_1.name);
    ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
    async onModuleInit() {
        this.logger.log('='.repeat(60));
        this.logger.log('🚀 Initializing Ollama...');
        this.logger.log('='.repeat(60));
        try {
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
                await this.waitForOllama(10);
            }
            else {
                this.logger.log('✅ Ollama is running!');
            }
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
            }
            else {
                this.logger.log(`✅ Model '${this.ollamaModel}' is ready!`);
            }
            this.logger.log('='.repeat(60));
            this.logger.log('✅ Ollama is fully configured and ready!');
            this.logger.log('='.repeat(60));
        }
        catch (error) {
            this.logger.error(`⚠️  Ollama initialization warning: ${error}`);
            this.logger.warn('Chat system will still work, but complex queries may be slower');
        }
    }
    async isOllamaRunning() {
        try {
            const response = await axios_1.default.get(`${this.ollamaUrl}/api/tags`, {
                timeout: 5000,
            });
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    async autoStartOllama() {
        try {
            try {
                (0, child_process_1.execSync)('docker --version', { encoding: 'utf8' });
            }
            catch {
                this.logger.warn('Docker not found. Please install Docker and start Ollama manually.');
                return false;
            }
            try {
                const containers = (0, child_process_1.execSync)('docker ps -a --filter name=ollama --format "{{.Names}}"', {
                    encoding: 'utf8',
                }).trim();
                if (containers) {
                    this.logger.log('Found existing ollama container. Starting it...');
                    (0, child_process_1.execSync)('docker start ollama', { encoding: 'utf8' });
                    return true;
                }
            }
            catch (error) {
            }
            this.logger.log('Creating new Ollama container...');
            (0, child_process_1.execSync)('docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama ollama/ollama', { encoding: 'utf8', stdio: 'pipe' });
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to auto-start Ollama: ${error}`);
            return false;
        }
    }
    async waitForOllama(maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await axios_1.default.get(`${this.ollamaUrl}/api/tags`, {
                    timeout: 2000,
                });
                if (response.status === 200) {
                    return true;
                }
            }
            catch {
            }
            this.logger.log(`Waiting for Ollama... (${i + 1}/${maxAttempts})`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return false;
    }
    async hasModel() {
        try {
            const response = await axios_1.default.get(`${this.ollamaUrl}/api/tags`);
            const models = response.data?.models || [];
            return models.some((m) => m.name === this.ollamaModel || m.name.startsWith(this.ollamaModel + ':'));
        }
        catch (error) {
            return false;
        }
    }
    async pullModel() {
        try {
            const response = await axios_1.default.post(`${this.ollamaUrl}/api/pull`, {
                name: this.ollamaModel,
                stream: false,
            }, {
                timeout: 600000,
            });
            return response.status === 200;
        }
        catch (error) {
            this.logger.error(`Failed to pull model: ${error}`);
            return false;
        }
    }
};
exports.OllamaInitService = OllamaInitService;
exports.OllamaInitService = OllamaInitService = OllamaInitService_1 = __decorate([
    (0, common_1.Injectable)()
], OllamaInitService);
//# sourceMappingURL=ollama-init.service.js.map