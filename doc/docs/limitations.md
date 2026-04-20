# Limitations

## Content Availability

In contrast to other on-chain _on-demand_ storage solutions, onchfs requires an http proxy to display the content of a resource, as it cannot reliably serve files directly from on-chain read calls. In essence, we consider this limitation to be fairly acceptable as this in-between http-proxy layer is very straightforward and can easily be ran by anyone with an internet connection, without even having to rely on a 3rd party service.

:::info Read more
More infos about the [onchfs http proxy here](/docs/concepts/http-proxy).
:::

## Ecosystem integration

While ipfs is fairly supported on most platforms nowadays, onchfs is not. As such, platforms will not be capable of reliably displaying onchfs absolute URIs found on-chain due to the infancy of the protocol.

However, some solutions exist to get around this temporary problem. Smart Contract can store updateable base URIs to onchfs assets, initially configured to a valid http proxy, later updated to the `onchfs://` schema string:

```
onchfsCid = 3d767a081f6d...
baseUri = https://onchfs.proxy.com/
tokenUri = {baseUri}{onchfsCid}

at first ->
baseUri = https://onchfs.proxy.com/3d767a081f6d...

then when onchfs gets adopted ->
baseUri = onchfs://
tokenUri = onchfs://3d767a081f6d...
```
