import wabt from 'wabt';

import memory from '../memory';
import scanner, { TOKENS } from '../scanner';
import { getUtil } from '../util';

wabt().then(async (wabt) => {
  const module = await WebAssembly.compile(
    wabt
      .parseWat('inline', `;;wasm
(module
  (import "env" "memory"
    (memory 1))
  ${memory}
  ${scanner}
  (func 
    (export "init")
    (param $srcptr i32)
    (call $init_memory
      (i32.add
        (local.get $srcptr)
        (call $get_len
          (local.get $srcptr))))
    (call $init_scanner
      (local.get $srcptr)))
  (export "start"
    (global $start))
  (export "len"
    (global $len))
  (export "scan_token"
    (func $scan_token)))
`)
      .toBinary({})
      .buffer
  );
  const mem = new WebAssembly.Memory({ initial: 1 });
  const utilities = getUtil(mem.buffer);
  const importObject = {
    env: {
      memory: mem,
    },
    util: utilities,
  };
  const instance = await WebAssembly.instantiate(module, importObject);
  console.log('--');
  const memArray = new Uint8Array(mem.buffer);
  const source = new TextEncoder().encode(`1.2`);
  const len = new Uint32Array([source.length]);
  memArray.set(len)
  memArray.set(source, 4);
  (instance.exports.init as Function)(4);
  console.log(instance.exports.start.valueOf());
  console.log(instance.exports.len.valueOf());
  const result = (instance.exports.scan_token as Function)();
  console.log(instance.exports.start.valueOf());
  console.log(instance.exports.len.valueOf());
  console.log(utilities.stringToDouble(instance.exports.start.valueOf(), instance.exports.len.valueOf()))
  // utilities.hexDump(0, 64);
  utilities.logToken(result);
}).catch(e => {
  console.error(e);
});
