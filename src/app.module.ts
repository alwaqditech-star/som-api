import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import configuration from './config/configuration';
import { JwtAuthGuard, RolesGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { BidsModule } from './modules/bids/bids.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuctionGatewayModule } from './modules/auctions/auction-gateway.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ChatsModule } from './modules/chats/chats.module';
import { CronModule } from './modules/cron/cron.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    UploadsModule,
    ChatsModule,
    CronModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const useSsl = config.get<boolean>('database.ssl');
        const isServerless = Boolean(process.env.VERCEL);
        return {
          type: 'postgres',
          host: config.get('database.host'),
          port: config.get('database.port'),
          username: config.get('database.username'),
          password: config.get('database.password'),
          database: config.get('database.database'),
          autoLoadEntities: true,
          synchronize: config.get('nodeEnv') === 'development' && !useSsl,
          logging: config.get('nodeEnv') === 'development',
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          retryAttempts: isServerless ? 2 : 10,
          retryDelay: isServerless ? 1000 : 3000,
          keepConnectionAlive: !isServerless,
          extra: isServerless
            ? {
                max: 1,
                connectionTimeoutMillis: 15000,
                idleTimeoutMillis: 10000,
              }
            : undefined,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    WalletsModule,
    VehiclesModule,
    AuctionsModule,
    BidsModule,
    NotificationsModule,
    CategoriesModule,
    AuctionGatewayModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
