export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function getPagination(query: any) {
  const page = Math.max(parseInt(query?.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(parseInt(query?.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
