import { z } from 'zod';
const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  PORT: z.string().default('3000'),
  FRONTEND_URL: z.string().default('*'),
  DB_NAME: z.string().default('leetcode'),
  BCRYPT_ROUNDS: z.string().default('12'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missingVars = parsed.error.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ');
  console.error('\n❌ Missing or invalid environment variables:');
  console.error(`   ${missingVars}\n`);
  throw new Error('Invalid environment configuration');
}

export const ENV: Env = parsed.data;
