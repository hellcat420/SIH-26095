export interface DatabaseSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'S3_BUCKET',
    'REDIS_HOST',
    'REDIS_PASSWORD',
    'OTP_GATEWAY_URL',
    'CORS_ORIGINS',
    'RTSP_ALLOWED_HOSTS',
  ];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(', ')}.`);
  }
  if (process.env.JWT_SECRET!.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
  }

  let otpGateway: URL;
  try {
    otpGateway = new URL(process.env.OTP_GATEWAY_URL!);
  } catch {
    throw new Error('OTP_GATEWAY_URL must be a valid HTTPS URL in production.');
  }
  if (otpGateway.protocol !== 'https:') {
    throw new Error('OTP_GATEWAY_URL must use HTTPS in production.');
  }
}

export function getDatabaseSettings(): DatabaseSettings {
  const isProduction = process.env.NODE_ENV === 'production';
  validateProductionConfiguration();
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  if (isProduction) {
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required production database configuration: ${missing.join(', ')}.`);
    }
  }

  const port = Number(process.env.DB_PORT ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'dosje',
  };
}
