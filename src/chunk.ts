import { struct } from './common';

export enum OP_CODES {
  OP_CONSTANT = 1,
  OP_NIL,
  OP_TRUE,
  OP_FALSE,
  OP_POP,
  OP_GET_LOCAL,
  OP_SET_LOCAL,
  OP_GET_GLOBAL,
  OP_DEFINE_GLOBAL,
  OP_SET_GLOBAL,
  OP_GET_UPVALUE,
  OP_SET_UPVALUE,
  OP_NOT_EQUAL,
  OP_EQUAL,
  OP_GREATER,
  OP_NOT_LESS,
  OP_LESS,
  OP_NOT_GREATER,
  OP_ADD,
  OP_SUBTRACT,
  OP_MULTIPLY,
  OP_DIVIDE,
  OP_NOT,
  OP_NEGATE,
  OP_PRINT,
  OP_JUMP,
  OP_JUMP_IF_FALSE,
  OP_LOOP,
  OP_CALL,
  OP_CLOSURE,
  OP_CLOSE_UPVALUE,
  OP_RETURN,
  OP_CLASS,
}

const Chunk = struct([
  ['count', 'i32'],
  ['capacity', 'i32'],
  ['*code', 'i32'],
]);

export default `;;wasm
(func $init_chunk
  (result i32)
  (local $chunkptr i32)
  (local $capacity i32)
  (local.set $chunkptr
    ${Chunk.alloc()})
  (local.set $capacity
    (i32.const 2))
  ${Chunk.set(
    'capacity',
    `;;wasm
    (local.get $chunkptr)`,
    `;;wasm
    (local.get $capacity)`,
  )}
  ${Chunk.set(
    '*code',
    `;;wasm
    (local.get $chunkptr)`,
    `;;wasm
    (call $alloc
      (local.get $capacity))`,
  )}
  (local.get $chunkptr))
(func $get_codeptr
  (param $chunkptr i32)
  (param $i i32) ;; todo: bounds check this
  (result i32)
  (i32.add
    ${Chunk.get(
      '*code',
      `;;wasm
      (local.get $chunkptr)`,
    )}
    (local.get $i)))
(func $write_chunk
  (param $chunkptr i32)
  (param $code i32)
  (local $count i32)
  (local $capacity i32)
  (local.set $count
    ${Chunk.get(
      'count',
      `;;wasm
      (local.get $chunkptr)`,
    )})
  (local.set $capacity
    ${Chunk.get(
      'capacity',
      `;;wasm
      (local.get $chunkptr)`,
    )})
  (if
    (i32.gt_u
      (local.get $count)
      (local.get $capacity))
    (then
      (local.set $capacity
        (i32.mul
          (local.get $capacity)
          (i32.const 2)))
      ${Chunk.set(
        '*code',
        `;;wasm
        (local.get $chunkptr)`,
        `;;wasm
        (call $realloc
          ${Chunk.get(
            '*code',
            `;;wasm
            (local.get $chunkptr)`,
          )}
          (local.get $capacity))`,
      )}
      ${Chunk.set(
        'capacity',
        `;;wasm
        (local.get $chunkptr)`,
        `;;wasm
        (local.get $capacity)`,
      )}))
  (i32.store8
    (call $get_codeptr
      (local.get $chunkptr)
      (local.get $count))
    (local.get $code))
  ${Chunk.set(
    'count',
    `;;wasm
    (local.get $chunkptr)`,
    `;;wasm
    (i32.add
      (local.get $count)
      (i32.const 1))`,
  )})
(func $patch_chunk
  (param $chunkptr i32)
  (param $i i32)
  (param $code i32)
  (i32.store8
    (call $get_codeptr
      (local.get $chunkptr)
      (local.get $i))
    (local.get $code)))
`;
