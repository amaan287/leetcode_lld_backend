import { ObjectId } from 'mongodb';

export interface LLDQuestion {
  _id?: ObjectId;
  title: string;
  slug: string;
  scenario: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  createdAt?: Date;
}

