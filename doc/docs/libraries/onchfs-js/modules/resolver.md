# Resolver

The `resolver` module can be used to easily create a resource resolver for ONCHFS. As ONCHFS is stricly specified at an abstract blockchain-agnostic level, any ONCHFS-compatible system on any blockchain can have its resources resolved in a similar fashion.

There are 2 ways to create a ONCHFS proxy resolver:

- `simple`: declarative configuration of the resource endpoints, exposing a simple `resolve()` function
- `custom`: requires a configuration object which defines functions which will get executed during the resolution execution flow.

## Creating a simple resolver

TODO

## Creating a custom resolver

TODO

## Interfaces

TODO
