export default `;;wasm
(func $compile
  (param $srcptr i32)
  (local $token i32)
  (call $init_scanner
    (local.get $srcptr))
  (block $out
    (loop $run
      (local.set $token
        (call $scan_token))
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_EOF))
        (then
          (br $out)))
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_NUMBER))
        (then
          (call $write_chunk
            (global.get $OP_CONSTANT))
          (call $write_chunk
            (call $write_value_array
              (call $stringToDouble
                (global.get $start)
                (global.get $len))))
          (br $run)))
      (br $run)))
  (call $write_chunk
    (global.get $OP_RETURN)))
`;
