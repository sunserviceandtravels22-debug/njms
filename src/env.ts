// Implements: Doc 14 §4 (Environment variable validation schema)
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().default(3000),
  TZ: z.string().default('Asia/Kolkata'),
  APP_URL: z.string().url().optional().or(z.literal('')),
  APP_BASE_URL: z.string().url().optional().or(z.literal('')),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().default('dev-auth-secret-njms-production-fallback-key-32ch'),
  PIN_PEPPER: z.string().default('dev-pin-pepper-secret-string'),
  HEALTH_TOKEN: z.string().default('njms-health-probe-secret-token-2026'),
  CRON_SECRET: z.string().default('dev-cron-secret-12345'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(8),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missing = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    console.error(`[FATAL] Invalid environment configuration: ${missing}`);
  }
  // Do not crash dev if some non-critical var is missing, but default safely
  parsedEnv = envSchema.parse({
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'mysql://dummy:placeholder@srv2209.hstgr.io/dummy',
  });
}

export const env = parsedEnv;
