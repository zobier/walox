import { enumToGlobals } from './common';

export enum OP_CODES {
  OP_CONSTANT = 1,
  OP_NIL,
  OP_TRUE,
  OP_FALSE,
  OP_POP,
  OP_GET_LOCAL,
  OP_GET_GLOBAL,
  OP_DEFINE_GLOBAL,
  OP_SET_LOCAL,
  OP_SET_GLOBAL,
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
  OP_RETURN,
}

export default `;;wasm
${enumToGlobals(OP_CODES)}
(; typedef struct {
  i32 count;
  i32 capacity;
  i8 *code;
} Chunk ;)
(func $init_chunk
  (result i32)
  (local $chunkptr i32)
  (local $capacity i32)
  (local.set $chunkptr
    (call $alloc
      (i32.const 3)))
  (local.set $capacity
    (i32.const 2))
  (i32.store
    (i32.add
      (local.get $chunkptr)
      (i32.const 4)) ;; capacity
    (local.get $capacity))
  (i32.store
    (i32.add
      (local.get $chunkptr)
      (i32.const 8)) ;; *code
    (call $alloc
      (local.get $capacity)))
  (local.get $chunkptr))
(func $get_codeptr
  (param $chunkptr i32)
  (param $i i32) ;; todo: bounds check this
  (result i32)
  (i32.add
    (i32.load
      (i32.add
        (local.get $chunkptr)
        (i32.const 8))) ;; *code
    (local.get $i)))
(func $write_chunk
  (param $chunkptr i32)
  (param $code i32)
  (local $count i32)
  (local $capacity i32)
  (local.set $count
    (i32.load
      (local.get $chunkptr)))
  (local.set $capacity
    (i32.load
      (i32.add
        (local.get $chunkptr)
        (i32.const 4)))) ;; capacity
  (if
    (i32.gt_u
      (local.get $count)
      (local.get $capacity))
    (then
      (local.set $capacity
        (i32.mul
          (local.get $capacity)
          (i32.const 2)))
      (i32.store
        (i32.add
          (local.get $chunkptr)
          (i32.const 8)) ;; *code
        (call $realloc
          (i32.load
            (i32.add
              (local.get $chunkptr)
              (i32.const 8))) ;; *code
          (local.get $capacity)))
        (i32.store
          (i32.add
            (local.get $chunkptr)
            (i32.const 4)) ;; capacity
          (local.get $capacity))))
  (i32.store8
    (call $get_codeptr
      (local.get $chunkptr)
      (local.get $count))
    (local.get $code))
  (i32.store
    (local.get $chunkptr) ;; count
    (i32.add
      (local.get $count)
      (i32.const 1))))
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
