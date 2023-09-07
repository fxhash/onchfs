import { DirectoryInode, IFile, PrepareDirectoryDir, PrepareDirectoryFile } from "./types";
/**
 * Encodes the filename in 7-bit ASCII, where UTF-8 characters are escaped. Will
 * also escape any character that are not supported in the URI specification, as
 * these will be fetched using a similar pattern by browsers. The native
 * `encodeURIComponent()` method will be used for such a purpose.
 * @param name Filename to encode
 * @returns Filename encoded in 7-bit ASCII
 */
export declare function encodeFilename(name: string): string;
/**
 * Computed the different component of a directory inode based on the
 * preparation object.
 * @param dir A directory being prepared
 * @returns A directory inode, from which insertions can be derived
 */
export declare function computeDirectoryInode(dir: PrepareDirectoryDir): DirectoryInode;
/**
 * Builds a graph from a list of files (relative path from the directory root,
 * content) in a folder structure as it's going to be inscribed on the file
 * system.
 * @param files A list of the files (& their content), where paths are specified with separating "/"
 * @returns A tuple of (graph, leaves), where graph is a structure ready to be
 * parsed for insertion & leaves the leaves of the graph, entry points for
 * parsing the graph in reverse.
 */
export declare function buildDirectoryGraph(files: IFile[]): [PrepareDirectoryDir, PrepareDirectoryFile[]];
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
export declare function prepareDirectory(files: IFile[], chunkSize?: number): Promise<DirectoryInode>;
