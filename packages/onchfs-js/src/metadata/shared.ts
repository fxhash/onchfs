import hpack from "hpack.js"

/**
 * Given a field name, outputs its index in the HPACK static table.
 * @param name Name of the field to check in the static table
 */
export function fieldHpackStaticTableIndex(name: string): number | null {
  const elem = hpack["static-table"].table.find(
    row => row.name === name.toLowerCase()
  )
  if (!elem) return null
  return hpack["static-table"].table.indexOf(elem)
}
