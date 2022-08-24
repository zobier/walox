export default `;;wasm
(func $copyString
  (param $start i32)
  (param $len i32)
  (result f64)
  (local $ptr i32)
  (local $i i32)
  (local.set $ptr
    (call $alloc
      (local.get $len)))
  (local.set $i
    (i32.const 0))
  (loop $copy
    (i32.store
      (i32.add
        (local.get $ptr)
        (i32.mul
          (local.get $i)
          (i32.const 4)))
      (i32.load
        (i32.add
          (local.get $start)
          (i32.mul
            (local.get $i)
            (i32.const 4)))))
    (br_if $copy
      (i32.lt_u
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 1)))
        (local.get $len))))
  (call $obj_val
    (local.get $ptr)))
`;
