import mongoose from 'mongoose';

export async function connectDB(uri: string | undefined, serviceName: string): Promise<void> {
  if (!uri) {
    throw new Error(`MONGODB_URI is not set for ${serviceName}. Copy .env.example to .env first.`);
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[${serviceName}] Connected to MongoDB.`);
}
