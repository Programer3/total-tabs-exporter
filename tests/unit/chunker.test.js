import { chunkProcess, toChunks } from '../../utils/chunker.js';

describe('chunker', () => {
  describe('chunkProcess', () => {
    test('processes all items', async () => {
      const items = Array.from({ length: 200 }, (_, i) => i);
      const seen  = [];
      await chunkProcess(items, 50, (item) => seen.push(item));
      expect(seen).toEqual(items);
    });

    test('handles empty array', async () => {
      const seen = [];
      await chunkProcess([], 50, (item) => seen.push(item));
      expect(seen).toHaveLength(0);
    });

    test('handles array smaller than chunk size', async () => {
      const items = [1, 2, 3];
      const seen  = [];
      await chunkProcess(items, 100, (item) => seen.push(item));
      expect(seen).toEqual([1, 2, 3]);
    });

    test('propagates errors thrown in callback', async () => {
      const items = [1, 2, 3];
      await expect(
        chunkProcess(items, 50, () => { throw new Error('test-error'); })
      ).rejects.toThrow('test-error');
    });

    test('processes exactly 1000 items correctly', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const seen  = [];
      await chunkProcess(items, 50, (item) => seen.push(item));
      expect(seen).toHaveLength(1000);
      expect(seen[999]).toBe(999);
    });
  });

  describe('toChunks', () => {
    test('splits array into chunks of given size', () => {
      const chunks = toChunks([1, 2, 3, 4, 5], 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    test('returns single chunk if array is smaller than chunk size', () => {
      expect(toChunks([1, 2], 10)).toEqual([[1, 2]]);
    });

    test('returns empty array for empty input', () => {
      expect(toChunks([], 5)).toEqual([]);
    });
  });
});
