import { enumToGlobals } from './common';

export enum INTERPRET_RESULT {
  INTERPRET_OK = 1,
  INTERPRET_COMPILE_ERROR,
  INTERPRET_RUNTIME_ERROR,
};

export default `;;wasm
${enumToGlobals(INTERPRET_RESULT)}
(func $interpret
  (param $srcptr i32)
  (result i32)
  (local $ip i32)
  (local $code i32)
  (local $tmp f64)
  (local $result i32)
  (call $compile
    (local.get $srcptr))
  (call $dissasemble)
  (local.set $ip
    (i32.const 0))
  (call $init_stack)
  (block $out
    (loop $run
      (local.set $code
        (i32.load8_u
          (call $get_codeptr
            (local.get $ip))))
      ;; todo: create equivalent of switch for the following
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_CONSTANT))
        (then
          (call $push
            (call $get_value
              (i32.load8_u
                (call $get_codeptr
                  (local.tee $ip
                    (i32.add
                      (local.get $ip)
                      (i32.const 1)))))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_NIL))
        (then
          (call $push
            (f64.reinterpret_i64
              (global.get $NIL)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_TRUE))
        (then
          (call $push
            (f64.reinterpret_i64
              (global.get $TRUE)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_FALSE))
        (then
          (call $push
            (f64.reinterpret_i64
              (global.get $FALSE)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_ADD))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (f64.add
              (call $pop)
              (local.get $tmp)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_SUBTRACT))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (f64.sub
              (call $pop)
              (local.get $tmp)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_MULTIPLY))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (f64.mul
              (call $pop)
              (local.get $tmp)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_DIVIDE))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (f64.div
              (call $pop)
              (local.get $tmp)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_NEGATE))
        (then
          (call $push
            (f64.neg
              (call $pop)))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_RETURN))
        (then
          (call $logDouble
            (call $pop))
          (local.set $result
            (global.get $INTERPRET_OK))
          (br $out)))
      (br_if $run
        (i32.lt_s
          (local.tee $ip
            (i32.add
              (local.get $ip)
              (i32.const 1)))
          (i32.const 0xfff))) ;; exit if no return before we run out of memory
      (local.set $result
        (global.get $INTERPRET_RUNTIME_ERROR))))
    (local.get $result))
`;
