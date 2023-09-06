"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metadata_1 = require("./metadata");
describe("validate metadata value", () => {
    test("1-255 ascii chars allowed", () => {
        const set = String.fromCharCode(...new Array(255).fill(0).map((_, i) => i + 1));
        expect(() => (0, metadata_1.validateMetadataValue)(set)).not.toThrow();
    });
    test("forbidden characters throw an error", () => {
        for (const c of metadata_1.FORBIDDEN_METADATA_CHARS) {
            const str = String.fromCharCode(45, 34, 56, c, 45);
            expect(() => (0, metadata_1.validateMetadataValue)(str)).toThrow();
        }
    });
});
describe("file metadata encoding", () => {
    test("empty file metadata doesn't yield any byte", () => {
        expect((0, metadata_1.encodeFileMetadata)({})).toEqual([]);
    });
    test("unknown metadata field is ignored", () => {
        expect((0, metadata_1.encodeFileMetadata)({
            Unknown: "Random-Value",
        })).toEqual([]);
    });
    test("different metadata fields are properly prefixed", () => {
        expect((0, metadata_1.encodeFileMetadata)({ "Content-Type": "" })).toEqual([
            Buffer.from("0001", "hex"),
        ]);
        expect((0, metadata_1.encodeFileMetadata)({ "Content-Encoding": "" })).toEqual([
            Buffer.from("0002", "hex"),
        ]);
    });
    test("fields are encoded in the id-code asc order", () => {
        expect((0, metadata_1.encodeFileMetadata)({ "Content-Type": "", "Content-Encoding": "" })).toEqual([Buffer.from("0001", "hex"), Buffer.from("0002", "hex")]);
        expect((0, metadata_1.encodeFileMetadata)({ "Content-Encoding": "", "Content-Type": "" })).toEqual([Buffer.from("0001", "hex"), Buffer.from("0002", "hex")]);
    });
    test("encodes properly known results", () => {
        const known = [
            {
                metadata: {
                    "Content-Type": "application/json",
                },
                encoded: ["00016170706c69636174696f6e2f6a736f6e"],
            },
            {
                metadata: {
                    "Content-Type": "application/javascript",
                },
                encoded: ["00016170706c69636174696f6e2f6a617661736372697074"],
            },
            {
                metadata: { "Content-Type": "application/octet-stream" },
                encoded: ["00016170706c69636174696f6e2f6f637465742d73747265616d"],
            },
            {
                metadata: {
                    "Content-Type": "application/javascript",
                    "Content-Encoding": "gzip",
                },
                encoded: [
                    "00016170706c69636174696f6e2f6a617661736372697074",
                    "0002677a6970",
                ],
            },
            {
                metadata: { "Content-Encoding": "compress" },
                encoded: ["0002636f6d7072657373"],
            },
            { metadata: { "Content-Encoding": "gzip" }, encoded: ["0002677a6970"] },
        ];
        for (const entry of known) {
            expect((0, metadata_1.encodeFileMetadata)(entry.metadata)).toEqual(entry.encoded.map(hex => Buffer.from(hex, "hex")));
        }
    });
});
//# sourceMappingURL=metadata.test.js.map