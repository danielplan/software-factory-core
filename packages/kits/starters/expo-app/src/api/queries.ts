import { queryOptions } from '@tanstack/react-query';
import { itemsSchema } from './items.schema';
import { queryKeys } from './query-keys';
import { request } from './request';

// The app's answers from the backend, as TanStack Query options.

/** The made-up list of items shown on the home screen. */
export const itemsQuery = () =>
  queryOptions({
    queryKey: queryKeys.items(),
    queryFn: async ({ signal }) =>
      (await request('/api/items', itemsSchema, { signal })).items,
  });
