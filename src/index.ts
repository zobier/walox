import wabt from 'wabt';

import moduleSrc from './module';
import { getUtil } from './util';

wabt().then(async (wabt) => {
  const module = await WebAssembly.compile(
    wabt
      .parseWat('inline', moduleSrc)
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
  const source = new TextEncoder().encode(`4.2`);
  const len = new Uint32Array([source.length]);
  memArray.set(len)
  memArray.set(source, 4);
  const result = (instance.exports.main as Function)();
  // utilities.hexDump(0, 64);
  utilities.logInterpretResult(result);
}).catch(e => {
  console.error(e);
  const func = e.toString().match(/function #(\d+)/);
  if (func) {
    const funcName = Array.from(
      moduleSrc.matchAll(/\(\s*func\s*([$\w]+)/g)
    ).map(m => m[1])[func[1]];
    console.log(`Error in ${func[0]}: ${funcName}`);
  }
});
