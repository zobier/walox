export const enumToGlobals = (e: object) =>
  Object.keys(e)
    .filter((key) => isNaN(Number(key)))
    .map(
      (op) => `;;wasm
(global $${op} i32
  (i32.const ${e[op as keyof typeof e]}))`,
    )
    .join('\n');

export const watSwitch = (
  value: string,
  cases: [number, string][],
  default_case: string = '',
) => {
  const { head, tail, targets } = cases.reduce(
    ({ head, tail, targets }, [target, consequent], i) => {
      const label = `$case${i}`;
      (targets[target] as any) = label;
      return {
        head: `;;wasm
  (block ${label}
    ${head}`,
        targets,
        tail: `;;wasm
    ${tail})
    ;; ${label}
    ${consequent}`,
      };
    },
    {
      head: '',
      tail: '',
      targets: [],
    },
  );

  return `;;wasm
(block $break
  (block $default
${head}
  (br_table
    ${[...targets].map((t) => t || '$default').join(' ')} $default
    ${value})${tail}
${default_case}
  ))`;
};

export const toHex = (n: number) => '0x' + n.toString(16);

export const charToHex = (c: string) => {
  const code = c.charCodeAt(0);

  return toHex(code) + (code >= 32 ? ` (; '${c}' ;)` : '');
};

export const indent = (s: string, n: number) => s.replace(/^/gm, ' '.repeat(n));
