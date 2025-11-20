import { OnModuleInit } from '@nestjs/common';
export declare class OllamaInitService implements OnModuleInit {
    private readonly logger;
    private readonly ollamaUrl;
    private readonly ollamaModel;
    onModuleInit(): Promise<void>;
    private isOllamaRunning;
    private autoStartOllama;
    private waitForOllama;
    private hasModel;
    private pullModel;
}
