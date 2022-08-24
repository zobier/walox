export const enumToGlobals = (e: object) => Object.keys(e)
  .filter(key => isNaN(Number(key)))
  .map(op => `;;wasm
(global $${op} i32
  (i32.const ${e[op as keyof typeof e]}))`
  ).join('\n');
