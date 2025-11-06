import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),
  
  // JWT Secrets
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NextAuth URL must be a valid URL').optional(),
  
  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url('App URL must be a valid URL').optional(),
  
  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, 'SMTP port must be a number').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // File Upload (optional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  
  // Payment Processing (optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Maps API (optional)
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Security
  CORS_ORIGINS: z.string().optional(),
  ALLOWED_HOSTS: z.string().optional(),
  
  // Feature Flags
  ENABLE_REGISTRATION: z.string().transform(val => val !== 'false').default('true'),
  ENABLE_EMAIL_VERIFICATION: z.string().transform(val => val === 'true').default('false'),
  ENABLE_TWO_FACTOR: z.string().transform(val => val === 'true').default('false'),
});

// Validate environment variables
export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Get validated environment variables
export const env = validateEnv();

// Security configuration based on environment
export const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.NODE_ENV === 'production' ? '15m' : '1h',
    refreshExpiresIn: env.NODE_ENV === 'production' ? '7d' : '30d',
  },
  
  // Cookie Configuration
  cookies: {
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    httpOnly: true,
    domain: env.NODE_ENV === 'production' ? 
      new URL(env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000').hostname : 
      undefined,
  },
  
  // CORS Configuration
  cors: {
    origins: env.CORS_ORIGINS ? 
      env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
      env.NODE_ENV === 'production' ? 
        [env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
  
  // Rate Limiting
  rateLimit: {
    enabled: env.RATE_LIMIT_ENABLED,
    windowMs: 60 * 1000, // 1 minute
    maxRequests: env.NODE_ENV === 'production' ? 100 : 1000,
  },
  
  // Password Requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
  },
  
  // Session Configuration
  session: {
    maxAge: env.NODE_ENV === 'production' ? 15 * 60 : 60 * 60, // 15 min prod, 1 hour dev
    updateAge: 5 * 60, // Update session every 5 minutes
  },
  
  // File Upload Limits
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxFiles: 10,
  },
  
  // Database Configuration
  database: {
    uri: env.MONGODB_URI,
    options: {
      maxPoolSize: env.NODE_ENV === 'production' ? 10 : 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    },
  },
};

// Validate required secrets are properly set
export function validateSecrets() {
  const requiredSecrets = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NEXTAUTH_SECRET',
  ];
  
  const missingSecrets = requiredSecrets.filter(secret => {
    const value = process.env[secret];
    return !value || value.length < 32;
  });
  
  if (missingSecrets.length > 0) {
    throw new Error(
      `Missing or weak secrets: ${missingSecrets.join(', ')}. ` +
      'All secrets must be at least 32 characters long.'
    );
  }
}

// Generate secure random string for secrets
export function generateSecret(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Check if running in production
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// Feature flags
export const features = {
  registration: env.ENABLE_REGISTRATION,
  emailVerification: env.ENABLE_EMAIL_VERIFICATION,
  twoFactor: env.ENABLE_TWO_FACTOR,
  rateLimit: env.RATE_LIMIT_ENABLED,
};

// Logging configuration
export const loggingConfig = {
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableConsole: env.NODE_ENV !== 'production',
  enableFile: env.NODE_ENV === 'production',
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
  ],
};

// Initialize security configuration
export function initializeSecurity() {
  // Validate secrets
  validateSecrets();
  
  // Log security configuration (without sensitive data)
  if (isDevelopment) {
    console.log('Security Configuration:', {
      environment: env.NODE_ENV,
      corsOrigins: securityConfig.cors.origins,
      rateLimitEnabled: securityConfig.rateLimit.enabled,
      features,
    });
  }
  
  // Set up process handlers for security
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    if (isProduction) {
      process.exit(1);
    }
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (isProduction) {
      process.exit(1);
    }
  });
}

// Export type for environment variables
export type Environment = z.infer<typeof envSchema>;