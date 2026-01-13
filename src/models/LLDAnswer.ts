import { ObjectId } from 'mongodb';

export interface LLDAnswer {
  _id?: ObjectId;
  userId: ObjectId;
  questionId: ObjectId;
  answer: string;
  rating?: number;
  feedback?: string;
  submittedAt: Date;
}

