import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

function requireEnv(name: string, hint?: string) {
  if (process.env[name]) return;
  console.error(`[parity] Missing required environment variable: ${name}`);
  if (hint) console.error(`[parity] ${hint}`);
  process.exit(1);
}

async function bootstrap() {
  requireEnv(
    'DATABASE_URL',
    'Railway: open @parity/api → Variables → Add Reference → Postgres → DATABASE_URL',
  );
  requireEnv('JWT_SECRET', 'Set a random secret: openssl rand -hex 32');

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  });
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Parity API listening on 0.0.0.0:${port}`);
}

bootstrap();
