import wabt from 'wabt';

import moduleSrc from './module';
import { getUtil } from './util';

wabt()
  .then(async (wabt) => {
    const module = await WebAssembly.compile(
      wabt
        .parseWat('inline', moduleSrc, {
          multi_value: true,
        })
        .toBinary({
          write_debug_names: true,
        }).buffer,
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
    const memArray = new Uint32Array(mem.buffer);
    const source = Uint32Array.from(
      `fun outer() { var x = "outside"; fun inner() { print x; } inner(); } outer();`,
      (c) => c.codePointAt(0) || 0,
    );
    memArray.set([source.length]);
    memArray.set(source, 1);
    const result = (instance.exports.main as Function)();
    // utilities.hexDump(0, 64);
    utilities.logInterpretResult(result);
  })
  .catch((e) => {
    console.error(e);
    const func = e.toString().match(/function #(\d+)/);
    if (func) {
      const funcName = Array.from(
        moduleSrc.matchAll(/\(\s*func\s*([$\w]+)/g),
      ).map((m) => m[1])[func[1]];
      console.log(`Error in ${func[0]}: ${funcName}`);
    }
  });
