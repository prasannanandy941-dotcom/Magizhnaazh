import mongoose from 'mongoose';

// Connect to MongoDB, retrying in the BACKGROUND if the first attempt fails.
// Previously a single failed connect (paused Atlas cluster, IP not yet
// allow-listed, a blanked MONGODB_URI that later gets fixed, a transient network
// blip) left the service running forever with no DB — every query then buffered
// for 10s and returned "buffering timed out". Now the service keeps retrying, so
// the moment the database becomes reachable it connects on its own, with no
// redeploy or restart needed. Mongoose auto-reconnects after a drop once the
// initial connection has succeeded; this loop covers the initial connect too.
export async function connectDB(uri: string | undefined, serviceName: string): Promise<void> {
  if (!uri) {
    throw new Error(`MONGODB_URI is not set for ${serviceName}. Copy .env.example to .env first.`);
  }
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => console.warn(`[${serviceName}] MongoDB disconnected.`));
  mongoose.connection.on('reconnected', () => console.log(`[${serviceName}] MongoDB reconnected.`));

  // Fail a stalled connection attempt fast (8s) instead of hanging, so retries
  // start promptly and errors are clear.
  const options = { serverSelectionTimeoutMS: 8000 } as const;

  const attemptConnect = async (attempt: number): Promise<void> => {
    try {
      await mongoose.connect(uri, options);
      console.log(`[${serviceName}] Connected to MongoDB.`);
    } catch (err: any) {
      const delayMs = Math.min(30000, 2000 * attempt); // 2s, 4s, 6s … capped at 30s
      console.error(
        `[${serviceName}] MongoDB connection failed (attempt ${attempt}): ${err?.message || err}. ` +
        `Retrying in ${Math.round(delayMs / 1000)}s.`
      );
      setTimeout(() => { void attemptConnect(attempt + 1); }, delayMs);
    }
  };

  // Await only the first attempt so startup isn't blocked forever; if it fails,
  // retries continue in the background while the HTTP server comes up.
  await attemptConnect(1);
}
