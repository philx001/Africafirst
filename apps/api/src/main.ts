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

  // CORS en premier pour que les preflight OPTIONS reçoivent les bons en-têtes
  const envOrigins =
    configService
      .get<string>('CORS_ORIGINS')
      ?.split(',')
      .map((x) => x.trim())
      .filter(Boolean) ?? [];
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://[::1]:3000',
    ...(configService.get<string>('WEB_APP_URL') ? [configService.get<string>('WEB_APP_URL')!] : []),
    ...envOrigins,
  ]);

  const isDevLocalOrigin = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);

  app.enableCors({
    origin: (origin, callback) => {
      // Requêtes sans Origin : curl, same-origin navigateur sans header, mobile natif…
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      // Évite les erreurs opaques en dev sous Windows (::1 vs 127.0.0.1, autres ports Next).
      if (nodeEnv !== 'production' && isDevLocalOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Accept-Language',
      'X-Requested-With',
      'apikey',
      'x-client-info',
      'x-supabase-api-version',
    ],
  });

  // Sécurité HTTP — CORP par défaut (same-origin) casse souvent les appels SPA cross-origin
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      ...(nodeEnv !== 'production' ? { contentSecurityPolicy: false } : {}),
    }),
  );
  app.use(compression());

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
      .addTag('tickets', 'Tickets support')
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
