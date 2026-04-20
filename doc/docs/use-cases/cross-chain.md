# Cross-chain

Onchfs provides a specification for turning directories and files into inscriptions, following a process suited for any blockchain, as the file abstraction layer is high enough so that blockchain-implementation specifics can't interfere with it.

Due to files & directories being fully content-addressed, a same set of files/directories will end up having a same set of pointers regardless of the blockchain on which they're stored. This is particularly usefull when looking at cross-chain compatibility of the protocol, because it means that one asset may reference a resource on another blockchain, even though such resource may not currently exist on the former blockchain. Onchfs proxies will be responsible for handling requests to fetch corresponding files if needed, but eventually such files can be moved to the blockchain on which the original asset exists for ensuring it will be stored in perpetuity.

This can become useful if there is a need to use a cheaper blockchain for storing bigger chunks of data to be accessed from a more expensive blockchain. While not a typical scenario, it's worth noting the built-in onchfs support for such cases.
