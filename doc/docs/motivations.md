# Motivations

At [fxhash](https://fxhash.xyz) we build tools for Generative Artists to release their projects on blockchains. The project was first implemented on [Tezos](https://tezos.com/), however unlike other Generative Art platforms at the time we opted for storing any content on IPFS, as we realised uploading web-based Generative Art as a string (& providing an list of dependencies) was not a great experience for artists, especially in nowadays modern web standards. As we decided to provide support for storing the code on-chain, right before releasing support for Ethereum, we investigated the current state of on-chain storage for Generative Art projects.

Most platforms on Ethereum use html reconstruction on-chain based on:

- some javascript code proper to each project, uploaded as a string (encoded and compressed in various ways)
- a list of dependencies pointing to scripts previously uploaded by a central entity, in most cases (without options to upload any library for anyone to use in a convenient way)

The actual content is stored in a [Content-Addressable Store](https://en.wikipedia.org/wiki/Content-addressable_storage), and some logic is responsible for reconstructing the chunks of content into digestable files. Some notable projects are [ethfs](https://github.com/holic/ethfs) (general-purpose Content-Addressable Store + shared name-based file system), [scripty](https://github.com/intartnft/scripty.sol) (HTML reconstruction built on top of ETHFs).

While this approach provides on-demand HTML reconstruction as long as there is access to a running node, it presents strong disadvantages for what we would consider as a

- **interferences on artistic practices**: artists have not only to think about implementing each platform API for their project to be compliant, but also they must obey to some predefined code structure as eventually their whole code is going to be one string
- **inter-operability between assets**: while file data is content-addressed, files are addressed by their name on the system; this introduces major inter-operability issues as user can never fully trust some name faily describe the data it contains
- **security, vector for Supply Chain Attacks**: in essence, users have to rely on central entities to provide a list of verified files, which in essence can be composed of any arbitrary data which can only be verified by querying and inspecting such file. This introduces a vector for injecting malicious code in what would seem to be a legit and trusted file (imagine embedding a wallet drainer which would trigger past a given date on a file named `processing-1.3.1.min.js`, yet exposing all the features of its valid counterpart). While this approach may work for centralized & semi-centralized platforms, if we want to build an open ecosystem where anyone can provide libraries for public access, such system cannot fully be trusted.
- **too specialised**: outside of HTML reconstruction, it becomes hard to extend current approaches for any kind of file-based application

ONCHFS aims at solving what we consider to be core issues, at a cost we consider to be negligable. To give a quick overview, our approach solves all the points above but requires a file resolver (which can be an http-proxy or a service worker).
