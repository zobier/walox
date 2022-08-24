export default `;;wasm
(func $main
  (result i32)
  (local $srcptr i32)
  (local.set $srcptr
    (i32.const 4))
  (call $init_memory
    (i32.add
      (local.get $srcptr)
      (call $get_len
        (local.get $srcptr))))
  (call $init_chunk)
  (call $init_value_array)
  (call $interpret
    (local.get $srcptr)))
`;
