import { toHex } from "./common";

export default `;;wasm
(global $QNAN i64
  (i64.const 0x7ffc000000000000))
(global $NIL i64
  (i64.const 0x7ffc000000000001))
(global $TRUE i64
  (i64.const 0x7ffc000000000002))
(global $FALSE i64
  (i64.const 0x7ffc000000000003))
(; typedef struct {
  i32 count;
  i32 capacity;
  f64 *values;
} ValueArray ;)
(global $value_array
  (mut i32)
  (i32.const 0))
(func $init_value_array
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
      (i32.const 8)) ;; *values
    (call $alloc
      (local.get $capacity)))
  (global.set $value_array
    (local.get $this)))
(func $get_valueptr
  (param $i i32)
  (result i32)
  (local $this i32)
  (local.set $this
    (global.get $value_array))
  (i32.add
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 8))) ;; *values
    (i32.mul
      (local.get $i)
      (i32.const 8)))) ;; 64 / 8
(func $write_value_array
  (param $value f64)
  (result i32)
  ;; todo: realloc if count > capacity
  (local $this i32)
  (local $count i32)
  (local $valueptr i32)
  (local.set $this
    (global.get $value_array))
  (local.set $count
    (i32.load
      (local.get $this)))
  (local.set $valueptr
    (call $get_valueptr
      (local.get $count)))
  (f64.store
    (local.get $valueptr)
    (local.get $value))
  (i32.store
    (local.get $this) ;; count
    (i32.add
      (local.get $count)
      (i32.const 1)))
  (local.get $count))
(func $get_value
  (param $i i32)
  (result f64)
  (f64.load
    (call $get_valueptr
      (local.get $i))))
`;
