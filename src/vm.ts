import { enumToGlobals, indent, watSwitch } from './common';

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
${indent(watSwitch(
  '$code_switch',
  value => `;;wasm
    (i32.eq
      (local.get $code)
      ${value})`,
  label => ({
    '(global.get $OP_CONSTANT)': `;;wasm
      (call $push
        (call $get_value
          (i32.load8_u
            (call $get_codeptr
              (local.tee $ip
                (i32.add
                  (local.get $ip)
                  (i32.const 1)))))))
      (br ${label})`,
    '(global.get $OP_NIL)': `;;wasm
      (call $push
        (f64.reinterpret_i64
          (global.get $NIL)))
      (br ${label})`,
    '(global.get $OP_TRUE)': `;;wasm
      (call $push
        (f64.reinterpret_i64
          (global.get $TRUE)))
      (br ${label})`,
    '(global.get $OP_FALSE)': `;;wasm
      (call $push
        (f64.reinterpret_i64
          (global.get $FALSE)))
      (br ${label})`,
    '(global.get $OP_NOT)': `;;wasm
      (call $push
        (call $bool_val
          (i32.eqz
            (call $as_bool
              (call $pop)))))
      (br ${label})`,
    '(global.get $OP_NOT_EQUAL)': `;;wasm
      (call $push
        (call $bool_val
          (i32.eqz
            (call $equal
              (call $pop)
              (call $pop)))))
      (br ${label})`,
    '(global.get $OP_EQUAL)': `;;wasm
      (call $push
        (call $bool_val
          (call $equal
            (call $pop)
            (call $pop))))
      (br ${label})`,
    '(global.get $OP_GREATER)': `;;wasm
      (local.set $tmp ;; could invert comparison logic instead but harder to read
        (call $pop))
      (call $push
        (call $bool_val
          (f64.gt
            (call $pop)
            (local.get $tmp))))
      (br ${label})`,
    '(global.get $OP_NOT_LESS)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (call $bool_val
          (f64.ge
            (call $pop)
            (local.get $tmp))))
      (br ${label})`,
    '(global.get $OP_LESS)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (call $bool_val
          (f64.lt
            (call $pop)
            (local.get $tmp))))
      (br ${label})`,
    '(global.get $OP_NOT_GREATER)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (call $bool_val
          (f64.le
            (call $pop)
            (local.get $tmp))))
      (br ${label})`,
    '(global.get $OP_ADD)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (f64.add
          (call $pop)
          (local.get $tmp)))
      (br ${label})`,
    '(global.get $OP_SUBTRACT)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (f64.sub
          (call $pop)
          (local.get $tmp)))
      (br ${label})`,
    '(global.get $OP_MULTIPLY)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (f64.mul
          (call $pop)
          (local.get $tmp)))
      (br ${label})`,
    '(global.get $OP_DIVIDE)': `;;wasm
      (local.set $tmp
        (call $pop))
      (call $push
        (f64.div
          (call $pop)
          (local.get $tmp)))
      (br ${label})`,
    '(global.get $OP_NEGATE)': `;;wasm
      (call $push
        (f64.neg
          (call $pop)))
      (br ${label})`,
    '(global.get $OP_RETURN)': `;;wasm
      (call $print_value
        (call $pop))
      (local.set $result
        (global.get $INTERPRET_OK))
      (br $out)`,
  })), 6)}
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
