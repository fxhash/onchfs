export function BufferCopyFrom(source: Buffer, offset = 0, length?: number) {
  length = typeof length === "undefined" ? source.byteLength - offset : length
  const out = Buffer.alloc(length)
  source.copy(out, 0, offset, offset + length)
  return out
}