export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code || 'APP_ERROR',
        message: error.message,
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    },
  };
}

