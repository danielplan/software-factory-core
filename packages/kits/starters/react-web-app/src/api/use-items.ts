import { useQuery } from "@tanstack/react-query";
import { loadItems } from "@/api/load-items";

export function useItems() {
  return useQuery({ queryKey: ["items"], queryFn: loadItems, retry: 1 });
}
