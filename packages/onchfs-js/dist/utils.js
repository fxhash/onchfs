"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferCopyFrom = void 0;
function BufferCopyFrom(source, offset = 0, length) {
    length = typeof length === "undefined" ? source.byteLength - offset : length;
    const out = Buffer.alloc(length);
    source.copy(out, 0, offset, offset + length);
    return out;
}
exports.BufferCopyFrom = BufferCopyFrom;
//# sourceMappingURL=utils.js.map