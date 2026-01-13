import { ObjectId } from 'mongodb';
import { DSARepository } from '../repositories/DSARepository';
import type { DSAList } from '../models/DSAList';
import { AppError } from '../utils/errors';

export class DSAService {
  constructor(private dsaRepository: DSARepository) {}

  async createList(userId: string, name: string, isPublic: boolean = false): Promise<DSAList> {
    return this.dsaRepository.createList({
      userId: new ObjectId(userId),
      name,
      isPublic,
      problemIds: [],
    });
  }

  async getUserLists(userId: string): Promise<DSAList[]> {
    return this.dsaRepository.findListsByUserId(userId);
  }

  async getPublicLists(): Promise<DSAList[]> {
    return this.dsaRepository.findPublicLists();
  }

  async getListById(listId: string, userId?: string): Promise<DSAList> {
    const list = await this.dsaRepository.findListById(listId);
    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    // Check if user has access (owner or public)
    if (userId && list.userId.toString() !== userId && !list.isPublic) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    if (!list.isPublic && (!userId || list.userId.toString() !== userId)) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    return list;
  }

  async updateList(listId: string, userId: string, updates: { name?: string; isPublic?: boolean }): Promise<DSAList> {
    const list = await this.dsaRepository.findListById(listId);
    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    if (list.userId.toString() !== userId) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    const updated = await this.dsaRepository.updateList(listId, updates);
    if (!updated) {
      throw new AppError(500, 'Failed to update list', 'UPDATE_FAILED');
    }

    return updated;
  }

  async deleteList(listId: string, userId: string): Promise<void> {
    const list = await this.dsaRepository.findListById(listId);
    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    if (list.userId.toString() !== userId) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    const deleted = await this.dsaRepository.deleteList(listId);
    if (!deleted) {
      throw new AppError(500, 'Failed to delete list', 'DELETE_FAILED');
    }
  }

  async addProblemToList(listId: string, problemId: string, userId: string): Promise<void> {
    const list = await this.dsaRepository.findListById(listId);
    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    if (list.userId.toString() !== userId) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    const problem = await this.dsaRepository.findProblemById(problemId);
    if (!problem) {
      throw new AppError(404, 'Problem not found', 'PROBLEM_NOT_FOUND');
    }

    await this.dsaRepository.addProblemToList(listId, problemId);
  }

  async removeProblemFromList(listId: string, problemId: string, userId: string): Promise<void> {
    const list = await this.dsaRepository.findListById(listId);
    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    if (list.userId.toString() !== userId) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    await this.dsaRepository.removeProblemFromList(listId, problemId);
  }

  async toggleProblemStatus(
    listId: string,
    problemId: string,
    userId: string,
    isCompleted: boolean
  ): Promise<void> {
    const list = await this.dsaRepository.findListById(listId);
    if (!list) {
      throw new AppError(404, 'List not found', 'LIST_NOT_FOUND');
    }

    if (list.userId.toString() !== userId && !list.isPublic) {
      throw new AppError(403, 'Access denied', 'ACCESS_DENIED');
    }

    await this.dsaRepository.toggleProblemStatus(userId, problemId, listId, isCompleted);
  }

  async getListWithProblems(listId: string, userId?: string): Promise<{
    list: DSAList;
    problems: Array<{
      problem: any;
      status?: { isCompleted: boolean; checkedAt?: Date };
    }>;
  }> {
    const list = await this.getListById(listId, userId);
    const problems = await this.dsaRepository.findProblemsByIds(list.problemIds);
    
    let statuses: any[] = [];
    if (userId) {
      statuses = await this.dsaRepository.getStatusesForList(userId, listId);
    }

    const statusMap = new Map(
      statuses.map(s => [s.problemId.toString(), s])
    );

    return {
      list,
      problems: problems.map(problem => ({
        problem,
        status: statusMap.get(problem._id!.toString()),
      })),
    };
  }

  async searchProblemsByTitle(query: string, limit: number = 50): Promise<any[]> {
    return this.dsaRepository.searchProblemsByTitle(query, limit);
  }

  async getProblems(limit: number = 100, skip: number = 0): Promise<any[]> {
    return this.dsaRepository.getProblems(limit, skip);
  }

  async getProblemById(problemId: string): Promise<any> {
    const problem = await this.dsaRepository.findProblemById(problemId);
    if (!problem) {
      throw new AppError(404, 'Problem not found', 'PROBLEM_NOT_FOUND');
    }
    return problem;
  }
}

