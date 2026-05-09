import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';
import { PrismaModule } from './config/prisma.module';
import { SupabaseModule } from './config/supabase.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { AccountsModule } from './accounts/accounts.module';
import { DealsModule } from './deals/deals.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { InteractionsModule } from './interactions/interactions.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AutomationsModule } from './automations/automations.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SearchModule } from './search/search.module';
import { QuotesModule } from './quotes/quotes.module';
import { ContractsModule } from './contracts/contracts.module';
import { RATE_LIMIT } from '@crm/shared';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Logger Winston
    WinstonModule.forRoot(winstonConfig),

    // Rate limiting global
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => [
        {
          name: 'api',
          ttl: RATE_LIMIT.API_TTL * 1000,
          limit: RATE_LIMIT.API_LIMIT,
        },
      ],
    }),

    // Queue BullMQ (Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
      }),
    }),

    // Modules infrastructure
    PrismaModule,
    SupabaseModule,

    // Modules métier
    AuthModule,
    OrganizationsModule,
    UsersModule,
    ContactsModule,
    AccountsModule,
    DealsModule,
    ProjectsModule,
    TasksModule,
    InteractionsModule,
    DocumentsModule,
    NotificationsModule,
    AutomationsModule,
    QuotesModule,
    ContractsModule,
    ClientPortalModule,
    WebhooksModule,
    SearchModule,
  ],
})
export class AppModule {}
