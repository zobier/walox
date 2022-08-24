export default `;;wasm
(func $main
  (result i32)
  (call $init_chunk)
  (call $init_value_array)
  (call $write_chunk
    (global.get $OP_CONSTANT))
  (call $write_chunk
    (call $write_value_array
      (f64.const 1.2)))
  (call $write_chunk
    (global.get $OP_CONSTANT))
  (call $write_chunk
    (call $write_value_array
      (f64.const 3.4)))
  (call $write_chunk
    (global.get $OP_ADD))
  (call $write_chunk
    (global.get $OP_CONSTANT))
  (call $write_chunk
    (call $write_value_array
      (f64.const 5.6)))
  (call $write_chunk
    (global.get $OP_DIVIDE))
  (call $write_chunk
    (global.get $OP_NEGATE))
  (call $write_chunk
    (global.get $OP_RETURN))
  ;; (call $dissasemble)
  (call $interpret)
  )
`;
