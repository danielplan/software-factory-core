import { useQuery } from '@tanstack/react-query';
import { itemsQuery } from './queries';

/** The made-up list of items shown on the home screen. */
export function useItems() {
  return useQuery(itemsQuery());
}
