import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Dùng ValidationPipe để tự động validate DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('APTX3107 EKG API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 API ready at http://localhost:${process.env.PORT || 3000}/docs`);
}

bootstrap();
