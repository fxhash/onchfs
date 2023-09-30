import { Inscription } from "@/types/inscriptions"
import { inscriptionBytesLength } from "./estimate"

/**
 * Given a list of inscriptions, which creates batches of inscriptions where
 * each batch is under the batch size limit, using a safety delta of 10% of
 * batch size. Each batch in the output will be under the given batch size,
 * ensuring writting all the inscriptions in the batch will not overflow the
 * batch size.
 *
 * @example Let's consider this list of inscriptions, where each inscription
 * is defined by its size in bytes:
 * [500, 200, 2000, 1500, 200, 5000, 3000, 40]
 * Given a batch size of 6000, this function will batch the inscriptions as
 * following:
 * [ [500, 200, 2000, 1500, 200], [5000], [3000, 40] ]
 *
 * @param inscriptions The list of inscriptions to batch together
 * @param batchSize The maximum size of a batch of inscription, in bytes. This
 * should match the blockchain maximum operation size, if such blockchain/batch
 * contract utility provides a way to write multiple inscriptions in a single
 * operation.
 *
 * @throws when the batch size is smaller than the size in bytes of one of the
 * inscriptions, as a single inscription cannot be divided.
 */
export function batch(
  inscriptions: Inscription[],
  batchSize: number
): Inscription[][] {
  const erroredBatchSize = Math.floor(batchSize * 0.9)
  const sizes = inscriptions.map(ins => inscriptionBytesLength(ins))
  const batches: Inscription[][] = []
  let size: number,
    ins: Inscription,
    currentBatch: Inscription[] = [],
    currentBatchSize: number = 0
  for (let i = 0; i < inscriptions.length; i++) {
    ins = inscriptions[i]
    size = sizes[i]
    // if the inscription is bigger than batch size, throw
    if (size > erroredBatchSize) {
      throw new Error(
        `One of the inscriptions is bigger than the given batch size - 10% (inscription: ${size}, allowed max size: ${erroredBatchSize})`
      )
    }
    // if current batch overflow, add it to the batches
    if (currentBatchSize + size > erroredBatchSize) {
      batches.push(currentBatch)
      currentBatch = []
      currentBatchSize = 0
    }
    // add inscription to the current batch
    currentBatch.push(ins)
    currentBatchSize += size
  }

  // add the remaining batch to the batches, if not empty
  if (currentBatch.length !== 0) {
    batches.push(currentBatch)
  }

  return batches
}
