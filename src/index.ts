import wabt from 'wabt';

import chunk from './chunk';
import debug from './debug';
import main from './main';
import memory from './memory';
import util, { getUtil } from './util';

wabt().then(async (wabt) => {
  const module = await WebAssembly.compile(
    wabt
      .parseWat(
        'inline',
        `;;wasm
        (module
          (import "env" "memory"
            (memory 1))
          ${util} ;; imports must occur before all non-import definitions
          ${memory}
          ${chunk}
          ${debug}
          ${main}
          (export "main"
            (func $main)))`
      )
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
  (instance.exports.main as Function)();
  utilities.hexDump(0, 16);
}).catch(e => {
  console.error(e);
});
