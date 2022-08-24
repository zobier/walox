export const enumToGlobals = (e: object) => Object.keys(e)
  .filter(key => isNaN(Number(key)))
  .map(op => `;;wasm
(global $${op} i32
  (i32.const ${e[op as keyof typeof e]}))`
  ).join('\n');

export const watSwitch = (
  label: string,
  condition: (value: string) => string,
  cases: (label: string) => Record<string, string>,
) => {
  return `;;wasm
(block ${label}
${Object.entries(cases(label)).map(([value, subsequent]) => `;;wasm
  (if
    ${condition(value)}
    (then
      ${subsequent}))
`).join('')}
)`;
};

export const toHex = (n: number) => '0x' + n.toString(16);

export const charToHex = (c: string) => {
  const code = c.charCodeAt(0);

  return toHex(code) +
    (code >= 32 ? ` (; '${c}' ;)` : '');
};

export const indent = (s: string, n: number) => s.replace(/^/mg, ' '.repeat(n));
