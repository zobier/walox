export enum OP_CODES {
  OP_RETURN = 1,
  OP_FOO,
}

export default `;;wasm
${Object.keys(OP_CODES)
    .filter(key => isNaN(Number(key)))
    .map(op => `;;wasm
(global $${op} i32
  (i32.const ${OP_CODES[op as keyof typeof OP_CODES]}))`
    ).join('\n')}
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
(func $write_chunk
  (param $code i32)
  ;; todo: realloc if count > capacity
  (local $this i32)
  (local $count i32)
  (local $codeptr i32)
  (local.set $this
    (global.get $chunk))
  (local.set $count
    (i32.load
      (local.get $this)))
  (local.set $codeptr
    (i32.add
      (i32.load
        (i32.add
          (local.get $this)
          (i32.const 8))) ;; *code
      (local.get $count)))
  (i32.store8
    (local.get $codeptr)
    (local.get $code))
  (i32.store
    (local.get $this) ;; count
    (i32.add
      (local.get $count)
      (i32.const 1))))
`;
