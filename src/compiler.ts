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
      (call $logToken
        (local.get $token))
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_EOF))
        (then
          (br $out)))
      (br $run))))
`;
