import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

// Try to load .env file, but don't fail if it doesn't exist (for production deployments)
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch (error) {
  console.log('No .env file found, using environment variables from system');
}

// Debug: Log which AWS env vars are available (without showing values)
if (process.env.NODE_ENV === 'production') {
  console.log('🔍 AWS Environment Variables Check:');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
  console.log('AWS_REGION:', process.env.AWS_REGION ? '✅ Set' : '❌ Missing');
  console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME ? '✅ Set' : '❌ Missing');
}

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('MongoDB URL'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    PAYLOAD_LIMIT: Joi.string().default('50mb').description('maximum payload size for requests'),
    AWS_ACCESS_KEY_ID: Joi.string().required().description('AWS access key ID'),
    AWS_SECRET_ACCESS_KEY: Joi.string().required().description('AWS secret access key'),
    AWS_REGION: Joi.string().required().description('AWS region'),
    AWS_BUCKET_NAME: Joi.string().required().description('AWS S3 bucket name'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

/** Build map of named SMTP accounts from env (SMTP_<NAME>_USERNAME, SMTP_<NAME>_PASSWORD). Uses default host/port. */
function buildSmtpAccounts(envVars) {
  const accounts = {};
  const names = ['audit', 'gst', 'incometax', 'roc', 'info'];
  for (const name of names) {
    const user = process.env[`SMTP_${name.toUpperCase()}_USERNAME`];
    const pass = process.env[`SMTP_${name.toUpperCase()}_PASSWORD`];
    if (user && pass) {
      accounts[name] = {
        smtp: {
          host: envVars.SMTP_HOST,
          port: envVars.SMTP_PORT,
          auth: { user, pass },
        },
        from: user,
      };
    }
  }
  return accounts;
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  payloadLimit: envVars.PAYLOAD_LIMIT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true, // Optional: Remove this if using Mongoose v6+
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
    // Multiple SMTP accounts (audit, gst, incometax, roc, info). Use in email.service via fromAccount key.
    smtpAccounts: buildSmtpAccounts(envVars),
  },
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3: {
      bucket: envVars.AWS_BUCKET_NAME,
    }
  },
};

export default config;
