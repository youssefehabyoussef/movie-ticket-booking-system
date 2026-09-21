import bcrypt from 'bcrypt';
import { HydratedDocument, Model, Schema, model } from 'mongoose';
import { env } from '../config/env';
import { jsonTransform } from '../utils/jsonTransform';

export const USER_ROLES = ['customer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    // Never returned by default; the login query opts in with .select('+password')
    password: { type: String, required: [true, 'Password is required'], select: false },
    role: { type: String, enum: USER_ROLES, default: 'customer' },
  },
  { timestamps: true, toJSON: { transform: jsonTransform } },
);

// Hash the password with bcrypt whenever it is set or changed.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
});

userSchema.methods.comparePassword = async function (
  this: HydratedDocument<IUser>,
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = model<IUser, UserModel>('User', userSchema);
