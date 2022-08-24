export default `;;wasm
(func $main
  (call $init_chunk)
  (call $init_value_array)
  (call $write_chunk
    (global.get $OP_CONSTANT))
  (call $write_chunk
    (call $write_value_array
      (f64.const 1.2)))
  (call $write_chunk
    (global.get $OP_RETURN))
  (call $dissasemble))
`;
