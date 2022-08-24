import { OP_CODES } from './chunk';
import { TOKENS } from './scanner';
import { INTERPRET_RESULT } from './vm';

export const getUtil = (buffer: ArrayBuffer) => ({
  hexDump(ptr: number, len: number) {
    const padHex = (num: number, len = 2) =>
      num.toString(16)
        .padStart(len, '0');
    const i32 = new Uint32Array(buffer, ptr, len);
    const hex = Array.from(i32)
      .map(n =>
        padHex(n, 8)
          .match(/../g)
          ?.reverse())
      .flat()
      .join('')
      .match(/.{32}/g)
      ?.map((row, i) => {
        const vals = row.match(/../g);
        const ascii = vals
          ?.reduce((str, val) =>
            str + String.fromCharCode(parseInt(val, 16)), '')
          .replace(/[\x00-\x1f]/g, '.');

        return padHex(i * 16, 6) +
          ' ' +
          vals
            ?.join(' ') +
          ' ' +
          ascii;
      })
      .join('\n');
    console.log(hex);
  },
  logString(ptr: number, len: number) {
    const str = new TextDecoder().decode(
      new Uint8Array(buffer, ptr, len)
    );
    console.log(str);
  },
  logChar(char: number) {
    console.log(String.fromCharCode(char));
  },
  logHex(num: number) {
    console.log(num.toString(16));
  },
  logNum(num: number) {
    console.log(num);
  },
  logOpCode(opCode: number) {
    console.log(OP_CODES[opCode]);
  },
  logInterpretResult(token: number) {
    console.log(INTERPRET_RESULT[token]);
  },
  logToken(token: number) {
    console.log(TOKENS[token]);
  },
});

export default `;;wasm
(import "util" "hexDump"
  (func $hexDump
    (param i32 i32)))
(import "util" "logString"
  (func $logString
    (param i32 i32)))
(import "util" "logChar"
  (func $logChar
    (param i32)))
(import "util" "logHex"
  (func $logHex
    (param i32)))
(import "util" "logNum"
  (func $logNum
    (param i32)))
(import "util" "logNum"
  (func $logDouble
    (param f64)))
(import "util" "logOpCode"
  (func $logOpCode
    (param i32)))
(import "util" "logInterpretResult"
  (func $logInterpretResult
    (param i32)))
(import "util" "logToken"
  (func $logToken
    (param i32)))
`;
