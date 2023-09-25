import { parseAuthority, parseSchema, parseSchemaSpecificPart } from "./parse"

export { parseURI as parse } from "./parse"

export const utils = {
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart,
}
