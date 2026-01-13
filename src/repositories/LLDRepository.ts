import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { LLDQuestion } from '../models/LLDQuestion';
import { LLDAnswer } from '../models/LLDAnswer';

export class LLDRepository {
  private getQuestionsCollection(): Collection<LLDQuestion> {
    return getDatabase().collection<LLDQuestion>('lld_questions');
  }

  private getAnswersCollection(): Collection<LLDAnswer> {
    return getDatabase().collection<LLDAnswer>('lld_answers');
  }

  // Question operations
  async createQuestion(question: Omit<LLDQuestion, '_id'>): Promise<LLDQuestion> {
    const result = await this.getQuestionsCollection().insertOne({
      ...question,
      createdAt: new Date(),
    } as LLDQuestion);
    return (await this.getQuestionsCollection().findOne({ _id: result.insertedId }))!;
  }

  async findQuestionById(id: string | ObjectId): Promise<LLDQuestion | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.getQuestionsCollection().findOne({ _id: objectId });
  }

  async findQuestions(filters?: { category?: string; difficulty?: string }): Promise<LLDQuestion[]> {
    const query: any = {};
    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.difficulty) {
      query.difficulty = filters.difficulty;
    }
    return this.getQuestionsCollection().find(query).toArray();
  }

  // Answer operations
  async createAnswer(answer: Omit<LLDAnswer, '_id'>): Promise<LLDAnswer> {
    const result = await this.getAnswersCollection().insertOne({
      ...answer,
      submittedAt: new Date(),
    } as LLDAnswer);
    return (await this.getAnswersCollection().findOne({ _id: result.insertedId }))!;
  }

  async updateAnswerRating(id: string | ObjectId, rating: number, feedback: string): Promise<LLDAnswer | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.getAnswersCollection().updateOne(
      { _id: objectId },
      { $set: { rating, feedback } }
    );
    return this.getAnswersCollection().findOne({ _id: objectId });
  }

  async findAnswerById(id: string | ObjectId): Promise<LLDAnswer | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.getAnswersCollection().findOne({ _id: objectId });
  }

  async findAnswersByUser(userId: string | ObjectId): Promise<LLDAnswer[]> {
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return this.getAnswersCollection().find({ userId: objectId }).toArray();
  }
}

