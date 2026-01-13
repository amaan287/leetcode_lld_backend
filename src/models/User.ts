import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password?: string; // Hashed password, optional for Google OAuth users
  name: string;
  googleId?: string;
  createdAt: Date;
}

export interface UserPublic {
  _id: string;
  email: string;
  name: string;
}

