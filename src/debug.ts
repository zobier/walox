export default `;;wasm
(func $dissasemble
  (local $chunkptr i32)
  (local $count i32)
  (local $i i32)
  (local $code i32)
  (local.set $chunkptr
    (global.get $chunk))
  (local.set $count
    (i32.load
      (local.get $chunkptr)))
  (local.set $i
    (i32.const 0))
  (loop $loop
    (local.set $code
      (i32.load8_u
        (call $get_codeptr
          (local.get $i))))
    (call $logOpCode
      (local.get $code))
    (if
      (i32.eq
        (local.get $code)
        (global.get $OP_CONSTANT))
      (then
        (call $logDouble
          (call $get_value
            (i32.load8_u
              (call $get_codeptr
                (local.tee $i
                  (i32.add
                    (local.get $i)
                    (i32.const 1)))))))))
    (br_if $loop
      (i32.lt_s
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 1)))
        (local.get $count)))))
`;
