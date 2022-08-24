import { readFileSync } from 'fs';
import getWabt from 'wabt';

import moduleSrc from './module';
import { getUtil } from './util';

if (typeof process !== 'undefined' && process?.versions?.node) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('usage: lox input-file-name');
    process.exit();
  }
  getLox()
    .then((lox) => lox(readFileSync(args[0], 'utf-8')))
    .catch((e) => console.error(e));
} else {
  (self as any).getLox = getLox;
}

async function getLox(
  logFn?: (output: any) => void,
): Promise<(input: string) => void> {
  const wabt = await getWabt();
  try {
    const module = wabt
      .parseWat('inline', moduleSrc, {
        multi_value: true,
      })
      .toBinary({
        write_debug_names: true,
      }).buffer;
    const mem = new WebAssembly.Memory({ initial: 1 });
    const utilities = getUtil(mem.buffer, logFn);
    const importObject = {
      env: {
        memory: mem,
      },
      util: utilities,
    };
    const { instance } = await WebAssembly.instantiate(module, importObject);
    const memArray = new Uint32Array(mem.buffer);

    return (input: string) => {
      const source = Uint32Array.from(input, (c) => c.codePointAt(0) || 0);
      memArray.set([source.length]);
      memArray.set(source, 1);
      const result = (instance.exports.main as Function)();
      // utilities.hexDump(0, 64);
      utilities.logInterpretResult(result);
    };
  } catch (e: any) {
    const func = e.toString().match(/function #(\d+)/);
    if (func) {
      const funcName = Array.from(
        moduleSrc.matchAll(/\(\s*func\s*([$\w]+)/g),
      ).map((m) => m[1])[func[1]];
      console.log(`Error in ${func[0]}: ${funcName}`);
    }
    throw e;
  }
}
