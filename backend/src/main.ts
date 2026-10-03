import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';

async function bootstrap() {
  const logger = new Logger('PlanForge-API');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000',
  );

  // Cookies
  app.use(cookieParser());

  // Normalize query parameters ending with [] (e.g., assignees[] -> assignees)
  app.use((req: any, _res: any, next: any) => {
    if (req.query) {
      for (const key of Object.keys(req.query)) {
        if (key.endsWith('[]')) {
          const cleanKey = key.slice(0, -2);
          if (req.query[cleanKey] === undefined) {
            req.query[cleanKey] = req.query[key];
          }
          delete req.query[key];
        }
      }
    }
    next();
  });

  // Global Prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global Interceptor & Filter
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('PlanForge — Project Management API')
    .setDescription(
      'Full-stack Project Management & Task Tracker — RESTful API with RBAC, Audit Logging, Real-time Notifications, and Data Management',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag(
      'Authentication',
      'User sign in, register, token rotation, and profile',
    )
    .addTag('Users', 'User management, RBAC role updates, and statuses')
    .addTag('Workspaces', 'Workspace creation, membership, and settings')
    .addTag('Projects', 'Project management, members, and configuration')
    .addTag(
      'Tasks',
      'Core task management — multi-filtering, sorting, Kanban, and subtasks',
    )
    .addTag('Sprints', 'Sprint lifecycle management')
    .addTag('Labels', 'Task label/tag management')
    .addTag('Comments', 'Task comments and discussions')
    .addTag('Attachments', 'File upload and attachment management')
    .addTag('Notifications', 'In-app notification system')
    .addTag('Audit Logs', 'System activity and change history trail')
    .addTag('Import/Export', 'Data import/export with background processing')
    .addTag('Analytics', 'Dashboard data and aggregation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`🚀 PlanForge Backend running on http://localhost:${port}/api`);
  logger.log(
    `📚 Swagger API Documentation at http://localhost:${port}/api/docs`,
  );
}

await bootstrap();
