import { ObjectId } from 'mongodb';

export interface DSAList {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  isPublic: boolean;
  problemIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

