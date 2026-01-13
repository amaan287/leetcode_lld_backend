import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import { User } from '../models/User';

export class UserRepository {
  private getCollection(): Collection<User> {
    return getDatabase().collection<User>('users');
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.getCollection().findOne({ email });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.getCollection().findOne({ googleId });
  }

  async findById(id: string | ObjectId): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.getCollection().findOne({ _id: objectId });
  }

  async create(user: Omit<User, '_id'>): Promise<User> {
    const result = await this.getCollection().insertOne({
      ...user,
      createdAt: new Date(),
    } as User);
    return (await this.getCollection().findOne({ _id: result.insertedId }))!;
  }

  async update(id: string | ObjectId, updates: Partial<User>): Promise<User | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.getCollection().updateOne(
      { _id: objectId },
      { $set: updates }
    );
    return this.findById(objectId);
  }
}

