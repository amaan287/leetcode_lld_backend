import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../config/database';
import type { DSAProblem } from '../models/DSAProblem';
import type { DSAList as DSAListModel } from '../models/DSAList';
import type { UserProblemStatus as UserProblemStatusModel } from '../models/UserProblemStatus';

export class DSARepository {
  private getProblemsCollection(): Collection<DSAProblem> {
    return getDatabase().collection<DSAProblem>('dsa_problems');
  }

  private getListsCollection(): Collection<DSAListModel> {
    return getDatabase().collection<DSAListModel>('dsa_lists');
  }

  private getStatusCollection(): Collection<UserProblemStatusModel> {
    return getDatabase().collection<UserProblemStatusModel>('user_problem_status');
  }

  // Problem operations
  async findProblemById(id: string | ObjectId): Promise<DSAProblem | null> {
    try {
      const objectId = typeof id === 'string' ? new ObjectId(id) : id;
      const problem = await this.getProblemsCollection().findOne({ _id: objectId });
      
      // If not found by _id, try searching by frontendQuestionId as fallback
      if (!problem && typeof id === 'string') {
        console.log('Problem not found by _id, trying frontendQuestionId:', id);
        return this.getProblemsCollection().findOne({ frontendQuestionId: id });
      }
      
      return problem;
    } catch (error) {
      // If ObjectId conversion fails, try searching by frontendQuestionId
      if (typeof id === 'string') {
        console.log('ObjectId conversion failed, trying frontendQuestionId:', id);
        return this.getProblemsCollection().findOne({ frontendQuestionId: id });
      }
      throw error;
    }
  }

  async findProblemsByIds(ids: ObjectId[]): Promise<DSAProblem[]> {
    return this.getProblemsCollection().find({ _id: { $in: ids } }).toArray();
  }

  async findProblemsWithEmbeddings(): Promise<DSAProblem[]> {
    return this.getProblemsCollection()
      .find({ title_embeddings_OAI: { $exists: true } })
      .toArray();
  }

  async searchProblemsByTitle(query: string, limit: number = 50): Promise<DSAProblem[]> {
    const searchRegex = new RegExp(query, 'i');
    return this.getProblemsCollection()
      .find({
        $or: [
          { title: searchRegex },
          { titleSlug: searchRegex },
          { frontendQuestionId: searchRegex },
        ],
      })
      .limit(limit)
      .toArray();
  }

  async getProblems(limit: number = 100, skip: number = 0): Promise<DSAProblem[]> {
    return this.getProblemsCollection()
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  // List operations
  async createList(list: Omit<DSAListModel, '_id' | 'createdAt' | 'updatedAt'>): Promise<DSAListModel> {
    const result = await this.getListsCollection().insertOne({
      ...list,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DSAListModel);
    return (await this.getListsCollection().findOne({ _id: result.insertedId }))!;
  }

  async findListById(id: string | ObjectId): Promise<DSAListModel | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.getListsCollection().findOne({ _id: objectId });
  }

  async findListsByUserId(userId: string | ObjectId): Promise<DSAListModel[]> {
    const objectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    return this.getListsCollection().find({ userId: objectId }).toArray();
  }

  async findPublicLists(): Promise<DSAListModel[]> {
    return this.getListsCollection().find({ isPublic: true }).toArray();
  }

  async updateList(id: string | ObjectId, updates: Partial<DSAListModel>): Promise<DSAListModel | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    await this.getListsCollection().updateOne(
      { _id: objectId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
    return this.findListById(objectId);
  }

  async deleteList(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.getListsCollection().deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  async addProblemToList(listId: string | ObjectId, problemId: string | ObjectId): Promise<boolean> {
    const listObjectId = typeof listId === 'string' ? new ObjectId(listId) : listId;
    const problemObjectId = typeof problemId === 'string' ? new ObjectId(problemId) : problemId;
    
    const result = await this.getListsCollection().updateOne(
      { _id: listObjectId },
      { 
        $addToSet: { problemIds: problemObjectId },
        $set: { updatedAt: new Date() }
      }
    );
    return result.modifiedCount > 0;
  }

  async removeProblemFromList(listId: string | ObjectId, problemId: string | ObjectId): Promise<boolean> {
    const listObjectId = typeof listId === 'string' ? new ObjectId(listId) : listId;
    const problemObjectId = typeof problemId === 'string' ? new ObjectId(problemId) : problemId;
    
    const result = await this.getListsCollection().updateOne(
      { _id: listObjectId },
      { 
        $pull: { problemIds: problemObjectId },
        $set: { updatedAt: new Date() }
      }
    );
    return result.modifiedCount > 0;
  }

  // Status operations
  async getProblemStatus(userId: string | ObjectId, problemId: string | ObjectId, listId: string | ObjectId): Promise<UserProblemStatusModel | null> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const problemObjectId = typeof problemId === 'string' ? new ObjectId(problemId) : problemId;
    const listObjectId = typeof listId === 'string' ? new ObjectId(listId) : listId;
    
    return this.getStatusCollection().findOne({
      userId: userObjectId,
      problemId: problemObjectId,
      listId: listObjectId,
    });
  }

  async toggleProblemStatus(
    userId: string | ObjectId,
    problemId: string | ObjectId,
    listId: string | ObjectId,
    isCompleted: boolean
  ): Promise<UserProblemStatusModel> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const problemObjectId = typeof problemId === 'string' ? new ObjectId(problemId) : problemId;
    const listObjectId = typeof listId === 'string' ? new ObjectId(listId) : listId;

    const existing = await this.getProblemStatus(userObjectId, problemObjectId, listObjectId);

    if (existing) {
      await this.getStatusCollection().updateOne(
        { _id: existing._id },
        { 
          $set: { 
            isCompleted,
            checkedAt: new Date(),
          }
        }
      );
      return (await this.getStatusCollection().findOne({ _id: existing._id }))!;
    } else {
      const result = await this.getStatusCollection().insertOne({
        userId: userObjectId,
        problemId: problemObjectId,
        listId: listObjectId,
        isCompleted,
        checkedAt: new Date(),
      } as UserProblemStatusModel);
      return (await this.getStatusCollection().findOne({ _id: result.insertedId }))!;
    }
  }

  async getStatusesForList(userId: string | ObjectId, listId: string | ObjectId): Promise<UserProblemStatusModel[]> {
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    const listObjectId = typeof listId === 'string' ? new ObjectId(listId) : listId;
    
    return this.getStatusCollection()
      .find({ userId: userObjectId, listId: listObjectId })
      .toArray();
  }
}

