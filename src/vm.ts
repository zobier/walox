import { enumToGlobals, indent, watSwitch } from './common';
import { OP_CODES } from './chunk';

export enum INTERPRET_RESULT {
  INTERPRET_OK = 1,
  INTERPRET_COMPILE_ERROR,
  INTERPRET_RUNTIME_ERROR,
}

export default `;;wasm
${enumToGlobals(INTERPRET_RESULT)}
(global $ip
  (mut i32)
  (i32.const 0))
(func $read_byte
  (result i32)
  (global.set $ip
    (i32.add
      (global.get $ip)
      (i32.const 1)))
  (i32.load8_u
    (call $get_codeptr
      (global.get $ip))))
(func $read_short
  (result i32)
  (local $cur i32)
  (local.set $cur
    (global.get $ip))
  (global.set $ip
    (i32.add
      (local.get $cur)
      (i32.const 2)))
  (i32.load16_u
    (call $get_codeptr
      (i32.add
        (local.get $cur)
        (i32.const 1)))))
(func $interpret
  (param $srcptr i32)
  (result i32)
  (local $code i32)
  (local $tmp f64)
  (local $offset i32)
  (local $result i32)
  (call $compile
    (local.get $srcptr))
  ;;(call $dissasemble)
  (call $init_stack)
  (block $out
    (loop $run
      (local.set $code
        (i32.load8_u
          (call $get_codeptr
            (global.get $ip))))
${indent(
  watSwitch(
    `;;wasm
    (local.get $code)`,
    [
      [
        OP_CODES.OP_CONSTANT,
        `;;wasm
        (call $push
          (call $get_value
            (call $read_byte)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_NIL,
        `;;wasm
        (call $push
          (f64.reinterpret_i64
            (global.get $NIL)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_TRUE,
        `;;wasm
        (call $push
          (f64.reinterpret_i64
            (global.get $TRUE)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_FALSE,
        `;;wasm
        (call $push
          (f64.reinterpret_i64
            (global.get $FALSE)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_POP,
        `;;wasm
        (call $pop)
        (br $break)`,
      ],
      [
        OP_CODES.OP_GET_LOCAL,
        `;;wasm
        (call $push
          (call $stack_get
            (call $read_byte)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_GET_GLOBAL,
        `;;wasm
        (call $push
          (call $table_get
            (call $get_value
              (call $read_byte))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_DEFINE_GLOBAL,
        `;;wasm
        (call $table_set
          (call $get_value
            (call $read_byte))
          (call $pop))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_LOCAL,
        `;;wasm
        (call $stack_set
          (call $read_byte)
          (call $peek))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_GLOBAL,
        `;;wasm
        (call $table_set ;; todo: check if not exists (new key)
          (call $get_value
            (call $read_byte))
          (call $peek))
        (br $break)`,
      ],
      [
        OP_CODES.OP_NOT,
        `;;wasm
        (call $push
          (call $bool_val
            (i32.eqz
              (call $as_bool
                (call $pop)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_NOT_EQUAL,
        `;;wasm
        (call $push
          (call $bool_val
            (i32.eqz
              (call $equal
                (call $pop)
                (call $pop)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_EQUAL,
        `;;wasm
        (call $push
          (call $bool_val
            (call $equal
              (call $pop)
              (call $pop))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_GREATER,
        `;;wasm
        (local.set $tmp ;; could invert comparison logic instead but harder to read
          (call $pop))
        (call $push
          (call $bool_val
            (f64.gt
              (call $pop)
              (local.get $tmp))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_NOT_LESS,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $push
          (call $bool_val
            (f64.ge
              (call $pop)
              (local.get $tmp))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_LESS,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $push
          (call $bool_val
            (f64.lt
              (call $pop)
              (local.get $tmp))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_NOT_GREATER,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $push
          (call $bool_val
            (f64.le
              (call $pop)
              (local.get $tmp))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_ADD,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (if
          (i32.and
            (call $is_string
              (local.get $tmp))
            (call $is_string
              (call $peek)))
          (then
            (call $push
              (call $concatenate
                (call $get_string
                  (call $pop))
                (call $get_string
                  (local.get $tmp)))))
          (else
            (call $push
              (f64.add
                (call $pop)
                (local.get $tmp)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SUBTRACT,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $push
          (f64.sub
            (call $pop)
            (local.get $tmp)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_MULTIPLY,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $push
          (f64.mul
            (call $pop)
            (local.get $tmp)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_DIVIDE,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $push
          (f64.div
            (call $pop)
            (local.get $tmp)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_NEGATE,
        `;;wasm
        (call $push
          (f64.neg
            (call $pop)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_PRINT,
        `;;wasm
        (call $print_value
          (call $pop))
        (br $break)`,
      ],
      [
        OP_CODES.OP_JUMP,
        `;;wasm
        (local.set $offset
          (call $read_short))
        (global.set $ip
          (i32.add
            (global.get $ip)
            (local.get $offset)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_JUMP_IF_FALSE,
        `;;wasm
        (local.set $offset
          (call $read_short))
        (if
          (i32.eqz
            (call $as_bool
              (call $peek)))
          (then
            (global.set $ip
              (i32.add
                (global.get $ip)
                (local.get $offset)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_LOOP,
        `;;wasm
        (local.set $offset
          (call $read_short))
        (global.set $ip
          (i32.sub
            (global.get $ip)
            (local.get $offset)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_RETURN,
        `;;wasm
        (local.set $result
          (global.get $INTERPRET_OK))
        (br $out)`,
      ],
    ],
  ),
  6,
)}
      (global.set $ip
        (i32.add
          (global.get $ip)
          (i32.const 1)))
      (br $run)
      (local.set $result
        (global.get $INTERPRET_RUNTIME_ERROR))))
    (local.get $result))
`;
