/**
 * @module utils/chunker
 * Async chunked processing for large arrays (1000+ tabs).
 * Yields to the event loop between chunks to keep the UI responsive.
 */

/**
 * Processes an array in chunks, yielding between each chunk via setTimeout.
 * This prevents blocking the main thread for large tab sets.
 *
 * @template T
 * @param {T[]} array        - Items to process
 * @param {number} chunkSize - Items per chunk (default: 50)
 * @param {(item: T, index: number) => void} fn - Callback per item
 * @returns {Promise<void>}
 */
export function chunkProcess(array, chunkSize = 50, fn) {
  if (array.length === 0) { return Promise.resolve(); }

  return new Promise((resolve, reject) => {
    let index = 0;

    function processChunk() {
      try {
        const end = Math.min(index + chunkSize, array.length);
        while (index < end) {
          fn(array[index], index);
          index++;
        }
        if (index < array.length) {
          setTimeout(processChunk, 0);
        } else {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    }

    processChunk();
  });
}

/**
 * Splits an array into chunks of a given size.
 * Pure utility for cases where you want the chunks themselves.
 *
 * @template T
 * @param {T[]} array
 * @param {number} chunkSize
 * @returns {T[][]}
 */
export function toChunks(array, chunkSize = 50) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
