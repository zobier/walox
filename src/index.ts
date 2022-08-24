import wabt from 'wabt';

import chunk from './chunk';
import debug from './debug';
import main from './main';
import memory from './memory';
import stack from './stack';
import util, { getUtil } from './util';
import value from './value';
import vm, { INTERPRET_RESULT } from './vm';

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
          ${value}
          ${debug}
          ${stack}
          ${vm}
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
  const result = (instance.exports.main as Function)();
  // utilities.hexDump(0, 64);
  console.log(INTERPRET_RESULT[result]);
}).catch(e => {
  console.error(e);
});
