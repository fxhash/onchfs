"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chunks_1 = require("./chunks");
const xB = (str) => Buffer.from(str, "hex");
console.log((0, chunks_1.chunkBytes)(xB("0000")));
describe("chunking somes bytes", () => {
    test("empty buffer doesn't return any chunk", () => {
        expect((0, chunks_1.chunkBytes)(Buffer.alloc(0))).toHaveLength(0);
    });
    test("chunking 2 bytes with chunkskize=1 produces 2 chunks of 1 byte", () => {
        expect((0, chunks_1.chunkBytes)(xB("0000"))).toEqual([
            {
                bytes: xB("00"),
                // hash: keccak_0,
            },
            {
                bytes: xB("00"),
                // hash: keccak_0,
            },
        ]);
    });
});
//# sourceMappingURL=chunks.test.js.map