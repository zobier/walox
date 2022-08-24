export default `;;wasm
(func $main
  (call $init_chunk)
  (call $write_chunk
    (global.get $OP_FOO))
  (call $write_chunk
    (global.get $OP_RETURN))
  (call $dissasemble))
`;
