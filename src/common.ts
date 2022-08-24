export const enumToGlobals = (e: object) => Object.keys(e)
  .filter(key => isNaN(Number(key)))
  .map(op => `;;wasm
(global $${op} i32
  (i32.const ${e[op as keyof typeof e]}))`
  ).join('\n');

export const charToHex = (c: string) => {
  const code = c.charCodeAt(0);

  return '0x' + code.toString(16) +
    (code >= 32 ? ` (; '${c}' ;)` : '');
};

export const indent = (s: string, n: number) => s.replace(/^/mg, ' '.repeat(n));
