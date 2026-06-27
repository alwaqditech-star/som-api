import { getDatabaseConfig } from './database.config';

export default () => {
  const database = getDatabaseConfig();

  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'production',
    database,
    jwt: {
      secret: process.env.JWT_SECRET ?? 'change-me',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    auction: {
      bidExtensionSeconds: parseInt(
        process.env.AUCTION_BID_EXTENSION_SECONDS ?? '120',
        10,
      ),
      minDepositPercent: parseInt(
        process.env.AUCTION_MIN_DEPOSIT_PERCENT ?? '5',
        10,
      ),
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ?? 'som-app-db20a.firebasestorage.app',
    },
  };
};
