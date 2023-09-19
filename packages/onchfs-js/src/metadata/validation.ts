// a list of the forbidden characters in the metadata
// todo: point to where I found this in http specs
export const FORBIDDEN_METADATA_CHARS = [
  0, // NUL character
]

/**
 * Validate a metadata field value to check if if follows https contrasts.
 * todo: should be refined to properly implement the HTTP spec, right now just
 *       NUL is verified
 * @param value The metadata field value
 */
export function validateMetadataValue(value: string): void {
  for (let i = 0; i < value.length; i++) {
    if (FORBIDDEN_METADATA_CHARS.includes(value.charCodeAt(i))) {
      throw new Error(
        `contains invalid character (code: ${value.charCodeAt(
          i
        )}) at position ${i}`
      )
    }
  }
}
