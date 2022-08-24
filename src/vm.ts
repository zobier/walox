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
          (global.get $OP_NOT))
        (then
          (call $push
            (call $bool_val
              (i32.eqz
                (call $as_bool
                  (call $pop)))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_NOT_EQUAL)) ;; fix: nil != nil
        (then
          (call $push
            (call $bool_val
              (i32.eqz
                (f64.eq
                  (call $pop)
                  (call $pop)))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_EQUAL))
        (then
          (call $push
            (call $bool_val
              (f64.eq
                (call $pop)
                (call $pop))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_GREATER))
        (then
          (local.set $tmp ;; could invert comparison logic instead but harder to read
            (call $pop))
          (call $push
            (call $bool_val
              (f64.gt
                (call $pop)
                (local.get $tmp))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_NOT_LESS))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (call $bool_val
              (f64.ge
                (call $pop)
                (local.get $tmp))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_LESS))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (call $bool_val
              (f64.lt
                (call $pop)
                (local.get $tmp))))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_NOT_GREATER))
        (then
          (local.set $tmp
            (call $pop))
          (call $push
            (call $bool_val
              (f64.le
                (call $pop)
                (local.get $tmp))))))
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
          (call $print_value
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
