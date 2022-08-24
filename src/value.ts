import { toHex } from "./common";

export default `;;wasm
(global $SIGN_BIT i64
  (i64.const 0x8000000000000000))
(global $QNAN i64
  (i64.const 0x7ffc000000000000))
(global $NIL i64
  (i64.const 0x7ffc000000000001))
(global $FALSE i64
  (i64.const 0x7ffc000000000002))
(global $TRUE i64
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
(func $is_number
  (param $v f64)
  (result i32)
  (i64.ne
    (i64.and
      (i64.reinterpret_f64
        (local.get $v))
      (global.get $QNAN))
    (global.get $QNAN)))
(func $is_nil
  (param $v f64)
  (result i32)
  (i64.eq
    (i64.reinterpret_f64
      (local.get $v))
    (global.get $NIL)))
(func $is_bool
  (param $v f64)
  (result i32)
  (i64.eq
    (i64.or
      (i64.reinterpret_f64
        (local.get $v))
      (i64.const 1))
    (global.get $TRUE)))
(func $bool_val
  (param $b i32)
  (result f64)
  (f64.reinterpret_i64
    (select
      (global.get $TRUE)
      (global.get $FALSE)
      (local.get $b))))
(func $as_bool
  (param $v f64)
  (result i32)
  (i64.eq
    (i64.reinterpret_f64
      (local.get $v))
    (global.get $TRUE)))
(func $is_obj
  (param $v f64)
  (result i32)
  (i64.eq
    (i64.and
      (i64.reinterpret_f64
        (local.get $v))
      (i64.or
        (global.get $SIGN_BIT)
        (global.get $QNAN)))
    (i64.or
      (global.get $SIGN_BIT)
      (global.get $QNAN))))
(func $obj_val
  (param $ptr i32)
  (result f64)
  (f64.reinterpret_i64
    (i64.or
      (i64.extend_i32_u
        (local.get $ptr))
      (i64.or
        (global.get $SIGN_BIT)
        (global.get $QNAN)))))
(func $as_obj
  (param $v f64)
  (result i32)
  (i32.wrap_i64
    (i64.and
      (i64.reinterpret_f64
        (local.get $v))
      (i64.xor
        (i64.or
          (global.get $SIGN_BIT)
          (global.get $QNAN))
        (i64.const -1)))))
(func $equal
  (param $a f64)
  (param $b f64)
  (result i32)
  (local $result i32)
  (if
    (call $is_number
      (local.get $a))
    (then
      (local.set $result
        (f64.eq
          (local.get $a)
          (local.get $b)))))
  (if
    (call $is_string
      (local.get $a))
    (then
      (local.set $result
        (call $str_cmp
          (call $get_string
            (local.get $a))
          (call $get_string
            (local.get $b)))))
    (else
      (local.set $result
        (i64.eq
          (i64.reinterpret_f64
            (local.get $a))
          (i64.reinterpret_f64
            (local.get $b))))))
  (local.get $result))
(func $print_value
  (param $v f64)
  (local $ptr i32)
  (if
    (call $is_bool
      (local.get $v))
    (then
      (call $logBool
        (call $as_bool
          (local.get $v)))))
  (if
    (call $is_nil
      (local.get $v))
    (then
      (call $logNil)))
  (if
    (call $is_string
      (local.get $v))
    (then
      (local.set $ptr
        (call $get_string
          (local.get $v)))
      (call $logString
        (local.get $ptr)
        (call $get_len
          (local.get $ptr)))))
  (if
    (call $is_number
      (local.get $v))
    (then
      (call $logDouble
        (local.get $v)))))
`;
