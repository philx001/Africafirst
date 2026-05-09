import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { winstonConfig } from './config/winston.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT') || 3001;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  // Sécurité HTTP
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get<string>('NEXT_PUBLIC_API_URL') || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Préfixe global API
  app.setGlobalPrefix('api/v1');

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtre d'exceptions global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Documentation Swagger (non disponible en production)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CRM Africa First — API')
      .setDescription(
        'API REST du CRM SaaS multi-tenant. Authentification via Supabase JWT.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'supabase-jwt',
      )
      .addTag('auth', 'Authentification')
      .addTag('organizations', 'Gestion des organisations')
      .addTag('users', 'Gestion des utilisateurs')
      .addTag('contacts', 'Gestion des contacts')
      .addTag('accounts', 'Gestion des entreprises')
      .addTag('deals', 'Pipeline commercial')
      .addTag('projects', 'Gestion de projets')
      .addTag('tasks', 'Tâches')
      .addTag('interactions', 'Interactions')
      .addTag('documents', 'Documents')
      .addTag('notifications', 'Notifications')
      .addTag('automations', 'Automatisations')
      .addTag('client-portal', 'Portail client')
      .addTag('search', 'Recherche globale')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`🚀 API démarrée sur http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production') {
    console.log(`📖 Swagger disponible sur http://localhost:${port}/api/docs`);
  }
}

bootstrap();
