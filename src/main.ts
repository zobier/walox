export default `;;wasm
(global $chunk
  (mut i32)
  (i32.const 0))
(func $main
  (result i32)
  (local $srcptr i32)
  (local.set $srcptr
    (i32.const 4))
  (call $init_memory
    (i32.add
      (local.get $srcptr)
      (i32.mul
        (call $get_len
          (local.get $srcptr))
        (i32.const 4))))
  (global.set $chunk
    (call $init_chunk))
  (call $init_value_array
    (i32.const 32))
  (call $init_table)
  (call $interpret
    (local.get $srcptr)))
`;
