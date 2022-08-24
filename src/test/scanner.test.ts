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
  const source = new TextEncoder().encode(`foo`);
  memArray.set(new Uint32Array([source.length]))
  memArray.set(source, 4);
  (instance.exports.init as Function)(4);
  const [result, start, len] = (instance.exports.scan_token as Function)();
  console.log(start);
  console.log(len);
  utilities.logString(start, len);
  // utilities.hexDump(0, 64);
  utilities.logToken(result);
}).catch(e => {
  console.error(e);
});
