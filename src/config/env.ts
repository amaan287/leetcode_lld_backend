import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  PORT: z.string().default('3000'),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  const env = {
    MONGODB_URI: process.env.MONGODB_URI || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    PORT: process.env.PORT || '3000',
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((e: z.ZodIssue) => e.path.join('.')).join(', ');
      console.error('\n❌ Missing or invalid environment variables:');
      console.error(`   ${missingVars}\n`);
      console.error('📝 Please create a .env file in the backend directory.');
      console.error('   You can copy .env.example and fill in your values.\n');
      console.error('Required variables:');
      console.error('  - MONGODB_URI (MongoDB connection string)');
      console.error('  - OPENAI_API_KEY (OpenAI API key)');
      console.error('  - JWT_SECRET (Secret key for JWT tokens, min 32 chars)\n');
    }
    throw error;
  }
}

