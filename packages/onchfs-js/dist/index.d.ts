interface FileMetadataEntries {
    "Content-Type"?: string;
    "Content-Encoding"?: "gzip" | "deflate" | "compress";
}
type FileMetadataBytecodes = {
    [entry in keyof FileMetadataEntries]: Uint8Array;
};
/**
 * Validate a metadata field value to check if if follows https contrasts.
 * todo: should be refined to properly implement the HTTP spec, right now just
 *       NUL is verified
 * @param value The metadata field value
 */
declare function validateMetadataValue(value: string): void;
/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
declare function encodeFileMetadata(metadata: FileMetadataEntries): Uint8Array[];
declare function decodeFileMetadata(raw: Uint8Array[]): FileMetadataEntries;

type FileChunk = {
    bytes: Uint8Array;
    hash: Uint8Array;
};
type FileInode = {
    type: "file";
    chunks: FileChunk[];
    cid: Uint8Array;
    metadata: Uint8Array[];
};
type DirectoryInode = {
    type: "directory";
    cid: Uint8Array;
    files: {
        [name: string]: INode;
    };
};
type INode = DirectoryInode | FileInode;
type IFile = {
    path: string;
    content: Uint8Array;
};
/**
 * The Prepare typings are used to build a temporary graph for exploring a
 * directory structure, before it is turned into proper File Objects which can
 * be turned into inscriptions.
 */
type PrepareDirectoryFile = {
    type: "file";
    name: string;
    content: Uint8Array;
    parent: PrepareDirectoryDir;
    inode?: FileInode;
};
type PrepareDirectoryDir = {
    type: "directory";
    files: {
        [name: string]: PrepareDirectoryNode;
    };
    parent: PrepareDirectoryDir | null;
    inode?: DirectoryInode;
};
type PrepareDirectoryNode = PrepareDirectoryFile | PrepareDirectoryDir;

/**
 * Splits the content of a file into multiple chunks of the same size (except
 * if the remaining bytes of the last chunk don't cover a full chunk, in which
 * case a smaller chunk upload will be required). Chunks are also hashed, as
 * such this function returns tuples of (chunk, chunkHash).
 * @param content Raw byte content of the file
 * @param chunkSize Size of the chunks, it's recommend to pick the highest
 * possible chunk size for the targetted blockchain as to optimise the number
 * of write operations which will be performed. Depending on the use-case there
 * might be a need to create smaller chunks to allow for redundancy of similar
 * chunks uploaded to kick-in, resulting in write optimisations. As a reminder,
 * 32 bytes will be used to address a chunk in the store, as such every chunk
 * to be stored requires 32 bytes of extra storage.
 * @returns a list of chunks which can be uploaded to reconstruct the file
 */
declare function chunkBytes(content: Uint8Array, chunkSize?: number): FileChunk[];

type InscriptionChunk<DataEncoding = Uint8Array> = {
    type: "chunk";
    content: DataEncoding;
};
type InscriptionFile<DataEncoding = Uint8Array> = {
    type: "file";
    metadata: DataEncoding[];
    chunks: DataEncoding[];
};
type InscriptionDirectory<DataEncoding = Uint8Array> = {
    type: "directory";
    files: {
        [name: string]: DataEncoding;
    };
};
type Inscription<DataEncoding = Uint8Array> = InscriptionChunk<DataEncoding> | InscriptionFile<DataEncoding> | InscriptionDirectory<DataEncoding>;
/**
 * Traverse the inverted tree starting by the root, creating inscriptions as
 * it's being traversed. At the end of the flow the inscriptions will be
 * reversed to ensure they are written to the store in the right order (as the
 * onchfs will reject inodes pointing to inexisting resources; let it be file
 * chunks or directory files).
 * @param root The root of the tree, can be either the root directory or a file
 * @returns A list of inscription objects ready to be turned into operations
 */
declare function generateInscriptions(root: INode): Inscription[];
/**
 * Computes the maximum number of storage bytes which will be consumed by the
 * inscriptions when they are written on-chain. This is a maximum value, as
 * some chunks/files/directories may already have been written to the storage.
 * Note: this doesn't include eventual gas execution fees, which are blockchain-
 * dependant.
 * @param inscriptions Inscriptions for which storage bytes will be computed
 * @returns Number of bytes the inscriptions may take on the storage
 */
declare function inscriptionsStorageBytes(inscriptions: Inscription[]): number;

/**
 * Encodes the filename in 7-bit ASCII, where UTF-8 characters are escaped. Will
 * also escape any character that are not supported in the URI specification, as
 * these will be fetched using a similar pattern by browsers. The native
 * `encodeURIComponent()` method will be used for such a purpose.
 * @param name Filename to encode
 * @returns Filename encoded in 7-bit ASCII
 */
declare function encodeFilename(name: string): string;
/**
 * Computed the different component of a directory inode based on the
 * preparation object.
 * @param dir A directory being prepared
 * @returns A directory inode, from which insertions can be derived
 */
declare function computeDirectoryInode(dir: PrepareDirectoryDir): DirectoryInode;
/**
 * Builds a graph from a list of files (relative path from the directory root,
 * content) in a folder structure as it's going to be inscribed on the file
 * system.
 * @param files A list of the files (& their content), where paths are specified with separating "/"
 * @returns A tuple of (graph, leaves), where graph is a structure ready to be
 * parsed for insertion & leaves the leaves of the graph, entry points for
 * parsing the graph in reverse.
 */
declare function buildDirectoryGraph(files: IFile[]): [PrepareDirectoryDir, PrepareDirectoryFile[]];
/**
 * Given a list of files, will create an inverted tree of the directory
 * structure with the main directory as its root. Each file will be chunked in
 * preparation for the insertion. The whole structure will be ready for
 * computing the inscriptions on any blockchain network on which the protocol
 * is deployed.
 * @param files A list a files (with their path relative to the root of the
 * directory and their byte content)
 * @param chunkSize Maximum size of the chunks in which the file will be divided
 * @returns A root directory inode from which the whole directory tree can be
 * traversed, as it's going to be inscribed.
 */
declare function prepareDirectory(files: IFile[], chunkSize?: number): Promise<DirectoryInode>;

/**
 * Computes all the necessary data for the inscription of the file on-chain.
 * Performs the following tasks in order:
 *  - infer/detect the mime-type from the filename/content
 *  - compress the content in gzip using zopfli, but only use the compressed
 *    bytes if they are smaller in size than the raw content
 *  - build the metadata object from previous steps, and encode the metadata in
 *    the format supported by the blockchain
 *  - chunk the content of the file
 *  - compute the CID of the file based on its content & its metadata
 * @param name The filename, will only be used to infer the Mime Type (a magic number cannot be used for text files so this is the privileged method)
 * @param content Byte content of the file, as a Buffer
 * @param chunkSize Max number of bytes for chunking the file content
 * @returns A file node object with all the data necessary for its insertion
 */
declare function prepareFile(name: string, content: Uint8Array, chunkSize?: number): Promise<FileInode>;

/**
 * The URI Authority defines the "host" of an asset, in this case a combination
 * of a blockchain (represented by string indentifier & chain ID) & a contract
 * on such blockchain compliant to the onchfs specifications.
 */
interface URIAuthority {
    blockchainName: string;
    contract: string;
    blockchainId: string;
}
/**
 * Provides a full broken-down representation of the URI in a formatted way.
 * While the authority is an optionnal segment when writing an onchfs URI, it
 * must be inferred during the resolution by providing a context.
 */
interface URIComponents {
    cid: string;
    authority: URIAuthority;
    path?: string;
    query?: string;
    fragment?: string;
}
/**
 * Some URI Context needs to be provided for most URI resolutions, as often
 * onchfs URI will rely of the context in which they are stored/seen to infer
 * their resolution. For instance, a base onchfs URI stored on ETH mainnet will
 * expect solvers to point to the main onchfs ETH contract.
 */
type URIContext = Pick<URIAuthority, "blockchainName"> & Pick<Partial<URIAuthority>, "blockchainId" | "contract">;
/**
 * Parses an absolute onchfs URI, following its ABNF specification. If any part
 * of the URI is mal-constructed, or if some context is missing to fully
 * resolve it, this function will throw with an error indicating where the
 * resolution has failed.
 *
 * @dev The resolution happens in 3 distinctive steps, each breaking down the
 * URI into smaller components which can be parsed more easily:
 *
 * * parseSchema
 *   <onchfs>://<schema-specific-part>
 *   Splits the URI into it's 2 biggest sections, extracting the schema from
 *   the schema-specific part.
 * * parseSchemaSpecificPart
 *   [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 *   Splits the schema-specific part into its various logical segments. This
 *   step validate the general structure of the URI as well.
 * * parseAuthority
 *   [ contract-address "." ] blockchain-name [ ":" chainid ]
 *   The authority segment is parsed, and using the context provided by the
 *   consumer it tries to resolve the authority.
 *
 * @param uri An absolute onchfs URI to be parsed
 * @param context The context in which the URI has been observed; such context
 * may be required for resolving the URI as it might be written in its short
 * form to save storage space, relying on inference from context; which is
 * valid part of the spec designed to optimise storage costs.
 * @returns A fully formed URI Components object, describing the various URI
 * components.
 */
declare function parseURI(uri: string, context?: URIContext): URIComponents;
/**
 * 1st order URI parsing; checks if the overall URI is valid by looking at the
 * protocol, and the schema-specific part. If any character in the URI invalid
 * (not part of the allowed URI characters), will throw.
 * Will also thrown if the general pattern doesn't not comply with onchfs URIs.
 * @param uri The URI to parse
 * @returns The URI schema-specific part
 */
declare function parseSchema(uri: string): string;
/**
 * The different segments of the URI Schema-Specific Component:
 * [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 */
interface URISchemaSpecificParts {
    cid: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
}
/**
 * Parses the schema-specific component (onchfs://<schema-specific-component>)
 * into a list of sub-segments based on the onchfs URI specification.
 * [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 * @param uriPart THe URI Schema-Specific Component
 * @returns An object with the different segments isolated
 */
declare function parseSchemaSpecificPart(uriPart: string): URISchemaSpecificParts;
/**
 * Given the string segment of the authority (or lack thereof) and a context in
 * which the URI exists, resolves the authority object (blockchain, chainid,
 * smart contract address) in which the object is supposed to be stored.
 *
 * The resolution is initialized with the provided context, after which the
 * authority segment of the URI (onchfs://<authority>/<cid>/<path>...) is parsed
 * and eventually overrides the given context (as some resources living in a
 * given context are allowed to reference assets existing in other contexts).
 *
 * If some authority components are still missing after the parsing, the
 * blockchain name is used to infer (chainid, contract address). In case
 * only contract is missing, it is inferred from (blockchain name, chainid).
 *
 * If any component is missing at the end of this process (ie: cannot be found
 * in the context, URI, and cannot be inferred), this functions throws.
 *
 * @param authority The string segment of the authority in the URI. If the
 * authority is missing from the CID, a context must be provided to resolve
 * the authority component.
 * @param context The context in which the authority is loaded. If such context
 * is not provided, the authority segment must have a blockchain name so that
 * the authority can be resolved using defaults.
 * @returns An object containing all the segments of the authority. If segment
 * doesn't exist, the context provided will be used to infer all the authority
 * components.
 */
declare function parseAuthority(authority?: string, context?: URIContext): URIAuthority;

interface InodeFileNativeFS {
    cid: string;
    metadata: (string | Uint8Array)[];
    chunkPointers: string[];
}
interface InodeDirectoryNativeFS {
    cid: string;
    files: Record<string, string>;
}
type InodeNativeFS = InodeFileNativeFS | InodeDirectoryNativeFS;
interface Resolver {
    getInodeAtPath: (cid: string, path: string[], authority?: URIAuthority) => Promise<InodeNativeFS | null>;
    readFile: (cid: string, chunkPointers: string[], authority?: URIAuthority) => Promise<string | Uint8Array>;
}
declare enum ProxyResolutionStatusErrors {
    NOT_ACCEPTABLE = 406,
    NOT_FOUND = 404,
    BAD_REQUEST = 400,
    INTERNAL_SERVER_ERROR = 500
}
declare enum ProxyResolutionStatusSuccess {
    OK = 200
}
declare enum ProxyResolutionStatusRedirect {
    PERMANENT = 308
}
type ProxyResolutionStatus = ProxyResolutionStatusSuccess | ProxyResolutionStatusErrors | ProxyResolutionStatusRedirect;
interface ProxyResolutionError {
    code: number;
    name: string;
    message?: string;
}
interface ProxyExtraHeaders {
    Location: string;
}
type ProxyHttpHeaders = FileMetadataEntries | ProxyExtraHeaders;
interface ProxyResolutionResponse {
    status: ProxyResolutionStatus;
    content: Uint8Array;
    headers: ProxyHttpHeaders;
    error?: ProxyResolutionError;
}
/**
 * Creates a generic-purpose URI resolver, leaving the implementation of
 * the file system resource resolution to the consumer of this API. The
 * resolver is a function of URI, which executes a series of file system
 * operations based on the URI content and the responses from the file
 * system.
 *
 * @param resolver An object which implements low-level retrieval methods to
 * fetch the necessary content from the file system in order to resolve the
 * URI.
 * @returns A function which takes an URI as an input and executes a serie of
 * operations to retrieve the file targetted by the URI. The resolution
 * of the file pointers against the file system is left to the consuming
 * application, which can implement different strategies based on the
 * use-cases.
 */
declare function createProxyResolver(resolver: Resolver): (uri: string) => Promise<ProxyResolutionResponse>;

/**
 * Hashes some bytes with keccak256. Simple typed wrapper to ease implementation
 * @param bytes Bytes to hash
 */
declare function keccak(bytes: Uint8Array | string): Uint8Array;

/**
 * Converts a hexadecimal string in a list of bytes, considering each pair
 * of characters in the string represents a byte. Will throw if the format
 * of the string is incorrect.
 * @param hex A hexadecimal string
 * @returns The bytes decoded from the hexadecimal string
 */
declare function hexStringToBytes(hex: string): Uint8Array;

declare const _default: {
    prepareFile: typeof prepareFile;
    prepareDirectory: typeof prepareDirectory;
    generateInscriptions: typeof generateInscriptions;
    utils: {
        chunkBytes: typeof chunkBytes;
        directory: {
            encodeFilename: typeof encodeFilename;
            computeInode: typeof computeDirectoryInode;
            computeGraph: typeof buildDirectoryGraph;
        };
        inscriptions: {
            computeStorageBytes: typeof inscriptionsStorageBytes;
        };
        metadata: {
            bytecodes: FileMetadataBytecodes;
            validateValue: typeof validateMetadataValue;
            encode: typeof encodeFileMetadata;
            decode: typeof decodeFileMetadata;
        };
    };
};

declare const files_prepareFile: typeof prepareFile;
declare namespace files {
  export {
    _default as default,
    files_prepareFile as prepareFile,
  };
}

/**
 * Wraps the low-level utility functions in a nested object to cleanup the
 * consumer API.
 */
declare const utils: {
    keccak: typeof keccak;
    chunkBytes: typeof chunkBytes;
    encodeFilename: typeof encodeFilename;
    computeDirectoryInode: typeof computeDirectoryInode;
    buildDirectoryGraph: typeof buildDirectoryGraph;
    validateMetadataValue: typeof validateMetadataValue;
    encodeFileMetadata: typeof encodeFileMetadata;
    hexStringToBytes: typeof hexStringToBytes;
};
/**
 * Wraps the config variables in a nested object to cleanup the consumer API.
 */
declare const config: {
    INODE_BYTE_IDENTIFIER: {
        FILE: Uint8Array;
        DIRECTORY: Uint8Array;
    };
    DEFAULT_CHUNK_SIZE: number;
    FORBIDDEN_METADATA_CHARS: number[];
    fileMetadataBytecodes: FileMetadataBytecodes;
    inscriptionsStorageBytes: typeof inscriptionsStorageBytes;
};
/**
 * Wraps th URI-related variables in a nested object
 */
declare const uri: {
    parse: typeof parseURI;
    utils: {
        parseSchema: typeof parseSchema;
        parseSchemaSpecificPart: typeof parseSchemaSpecificPart;
        parseAuthority: typeof parseAuthority;
    };
};
declare const resolver: {
    create: typeof createProxyResolver;
};

declare const Onchfs: {
    prepareFile: typeof prepareFile;
    prepareDirectory: typeof prepareDirectory;
    generateInscriptions: typeof generateInscriptions;
    utils: {
        keccak: typeof keccak;
        chunkBytes: typeof chunkBytes;
        encodeFilename: typeof encodeFilename;
        computeDirectoryInode: typeof computeDirectoryInode;
        buildDirectoryGraph: typeof buildDirectoryGraph;
        validateMetadataValue: typeof validateMetadataValue;
        encodeFileMetadata: typeof encodeFileMetadata;
        hexStringToBytes: typeof hexStringToBytes;
    };
    config: {
        INODE_BYTE_IDENTIFIER: {
            FILE: Uint8Array;
            DIRECTORY: Uint8Array;
        };
        DEFAULT_CHUNK_SIZE: number;
        FORBIDDEN_METADATA_CHARS: number[];
        fileMetadataBytecodes: FileMetadataBytecodes;
        inscriptionsStorageBytes: typeof inscriptionsStorageBytes;
    };
    uri: {
        parse: typeof parseURI;
        utils: {
            parseSchema: typeof parseSchema;
            parseSchemaSpecificPart: typeof parseSchemaSpecificPart;
            parseAuthority: typeof parseAuthority;
        };
    };
    resolver: {
        create: typeof createProxyResolver;
    };
    files: typeof files;
};

export { InodeNativeFS, Inscription, ProxyResolutionResponse, config, Onchfs as default, files, generateInscriptions, prepareDirectory, prepareFile, resolver, uri, utils };
