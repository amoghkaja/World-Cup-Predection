/**
 * Run row operations a few at a time instead of strictly one-by-one — bounded
 * concurrency for the per-row Supabase updates used throughout settlement.
 * (Shared by the server actions and the settlement module; was defined twice.)
 */
export async function inChunks<T>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  size = 20
): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}
