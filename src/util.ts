import { OP_CODES } from './chunk';
import { PRECEDENCE } from './compiler';
import { TOKENS } from './scanner';
import { INTERPRET_RESULT } from './vm';

export const getString = (buffer: ArrayBuffer, ptr: number, len: number) =>
  String.fromCodePoint(...Array.from(new Uint32Array(buffer, ptr, len)));

export const getUtil = (
  buffer: ArrayBuffer,
  log: (output: any) => void = console.log,
) => ({
  hexDump(ptr: number, len: number) {
    const padHex = (num: number, len = 2) =>
      num.toString(16).padStart(len, '0');
    const i32 = new Uint32Array(buffer, ptr, len);
    const hex = Array.from(i32)
      .map((n) => padHex(n, 8).match(/../g)?.reverse())
      .flat()
      .join('')
      .match(/.{32}/g)
      ?.map((row, i) => {
        const vals = row.match(/../g);
        const ascii = vals
          ?.reduce(
            (str, val) => str + String.fromCharCode(parseInt(val, 16)),
            '',
          )
          .replace(/[\x00-\x1f]/g, '.');

        return padHex(i * 16, 6) + ' ' + vals?.join(' ') + ' ' + ascii;
      })
      .join('\n');
    log(hex);
  },
  logString(ptr: number, len: number) {
    log(getString(buffer, ptr, len));
  },
  logChar(char: number) {
    log(String.fromCodePoint(char));
  },
  logHex(num: number) {
    log(num.toString(16));
  },
  logNil() {
    log('nil');
  },
  logBool(b: number) {
    log(!!b);
  },
  logNum(num: number) {
    log(num);
  },
  logOpCode(opCode: number) {
    log(OP_CODES[opCode] || opCode);
  },
  logInterpretResult(result: number) {
    log(INTERPRET_RESULT[result] || result);
  },
  logToken(token: number) {
    log(TOKENS[token] || token);
  },
  logPrecedence(prec: number) {
    log(PRECEDENCE[prec] || prec);
  },
  stringToDouble(ptr: number, len: number) {
    // todo: implement stdlib functions
    return parseFloat(getString(buffer, ptr, len));
  },
  tokenError(expected: number, got: number) {
    log(`Token error: expected ${TOKENS[expected]} got ${TOKENS[got]}`);
  },
  now() {
    return Date.now();
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
(import "util" "logNil"
  (func $logNil))
(import "util" "logBool"
  (func $logBool
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
(import "util" "logPrecedence"
  (func $logPrecedence
    (param i32)))
(import "util" "stringToDouble"
  (func $stringToDouble
    (param i32 i32)
    (result f64)))
(import "util" "tokenError"
  (func $tokenError
    (param i32 i32)))
(import "util" "now"
  (func $now
    (result f64)))
`;
