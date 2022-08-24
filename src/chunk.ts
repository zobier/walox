import { enumToGlobals } from './util';

export enum OP_CODES {
  OP_CONSTANT = 1,
  OP_RETURN,
}

export default `;;wasm
${enumToGlobals(OP_CODES)}
(; typedef struct {
  i32 count;
  i32 capacity;
  i8 *code;
} Chunk ;)
(global $chunk
  (mut i32)
  (i32.const 0))
(func $init_chunk
  (local $this i32)
  (local $capacity i32)
  (local.set $this
    (call $alloc
      (i32.const 3)))
  (local.set $capacity
    (i32.const 32))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 4)) ;; capacity
    (local.get $capacity))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 8)) ;; *code
    (call $alloc
      (local.get $capacity)))
  (global.set $chunk
    (local.get $this)))
(func $get_codeptr
  (param $i i32) ;; todo: bounds check this
  (result i32)
  (local $this i32)
  (local.set $this
    (global.get $chunk))
  (i32.add
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 8))) ;; *code
    (local.get $i)))
(func $write_chunk
  (param $code i32)
  ;; todo: realloc if count > capacity
  (local $this i32)
  (local $count i32)
  (local.set $this
    (global.get $chunk))
  (local.set $count
    (i32.load
      (local.get $this)))
  (i32.store8
    (call $get_codeptr
      (local.get $count))
    (local.get $code))
  (i32.store
    (local.get $this) ;; count
    (i32.add
      (local.get $count)
      (i32.const 1))))
`;
