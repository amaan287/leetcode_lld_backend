export function successResponse(data: any, requestId?: string) {
  return {
    success: true,
    data,
    error: null,
    requestId: requestId || '',
  };
}

export function errorResponse(
  code: string | undefined = 'INTERNAL_ERROR',
  message: string | undefined = 'An error occurred',
  requestId?: string
) {
  return {
    success: false,
    data: null,
    error: {
      code: code || 'INTERNAL_ERROR',
      message: message || 'An error occurred'
    },
    requestId: requestId || '',
  };
}
