import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI);
  console.log(`✅ MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
