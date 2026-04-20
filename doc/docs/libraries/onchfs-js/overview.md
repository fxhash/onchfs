# JS Library

ONCHFS JS library provides a set of utility functions making any interaction with onchfs much easier.

## Getting started

```bash
npm i onchfs
```

## Usage

```ts
import onchfs from "onchfs"

// dot notation hierarchy
onchfs.files.prepare(...)
```

Functions of the package are stateless and grouped into _modules_ based on their utility. Modules are exposed under the root of the package and can be exposed using dot notation (`onchfs.<module_name>.<function>`). Examples:

```ts
onchfs.files.prepare(...)
onchfs.inscriptions.prepare(...)
onchfs.metadata.encode(...)
```

Some modules have utility functions grouped into submodules for a better organization of the API, as such submodules are lower level utilities which are uncommon in most cases. Examples:

```ts
onchfs.files.utils.chunkBytes(...)
onchfs.files.utils.buildDirectoryGraph(...)
onchfs.uri.utils.parseAuthority()
onchfs.uri.utils.parseSchemaSpecificPart(...)
```

You can read more about each individual module and the functions they expose on their respective pages:

- [files](./modules/files)
- [inscriptions](./modules/inscriptions)
- [metadata](./modules/metadata)
- [resolver](./modules/resolver)
- [uri](./modules/uri)

## Most common operations

- [uploading a file/directory to ONCHFS](./common/uploading)
- [proxy server for serving ONCHFS content](./common/proxy-server)
