import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  mongoose: {
    url: string;
    options: {
      useNewUrlParser: boolean;
      useUnifiedTopology: boolean;
    };
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  email: {
    smtp: {
      host?: string;
      port?: string;
      auth?: {
        user?: string;
        pass?: string;
      };
    };
    from: string;
  };
  clientUrl: string;
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  mongoose: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/stadium-booking',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM || 'no-reply@stadium.la',
  },
  clientUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

export default config;