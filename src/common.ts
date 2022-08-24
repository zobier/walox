export const watSwitch = (
  value: string,
  cases: [number, string][],
  default_case: string = '',
) => {
  const { head, tail, targets } = cases.reduce(
    ({ head, tail, targets }, [target, consequent], i) => {
      const label: string = `$case${i}`;
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
;; default
${default_case}
  ))`;
};

const size = { i32: 4, i64: 8, f32: 4, f64: 8 };

type Type = keyof typeof size;
type Def = [string, Type];

const sizeof = (type: Type): number => size[type];

export const struct = (def: Def[]) => {
  const getOffset = (bytes: number, [, type]: Def) => bytes + sizeof(type);
  const getProp = (prop: string) => {
    const index = def.findIndex(([name]) => name === prop);
    if (index === -1) {
      throw new Error(`cannot find prop ${prop}`);
    }
    const type = def[index][1];
    const offset = def.slice(0, index).reduce(getOffset, 0);

    return { type, offset };
  };
  const addr = (prop: string, ptr: string) => {
    const { offset } = getProp(prop);

    return `;;wasm
      (i32.add
        ${ptr}
        (i32.const ${offset}))`;
  };
  const size = () => def.reduce(getOffset, 0);

  return {
    addr,
    alloc: () => `;;wasm
      (call $alloc
        (i32.const ${size() / 4}))`,
    get: (prop: string, ptr: string) => {
      const { type } = getProp(prop);

      return `;;wasm
        (${type}.load
          ${addr(prop, ptr)})`;
    },
    set: (prop: string, ptr: string, value: string) => {
      const { type } = getProp(prop);

      return `;;wasm
        (${type}.store
          ${addr(prop, ptr)}
          ${value})`;
    },
    size,
  };
};

export const toHex = (n: number) => '0x' + n.toString(16);

export const charToHex = (c: string) => {
  const code = c.charCodeAt(0);

  return toHex(code) + (code >= 32 ? ` (; '${c}' ;)` : '');
};

export const indent = (s: string, n: number) => s.replace(/^/gm, ' '.repeat(n));
