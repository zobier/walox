import { enumToGlobals, indent, watSwitch } from './common';
import { OP_CODES } from './chunk';

export enum INTERPRET_RESULT {
  INTERPRET_OK = 1,
  INTERPRET_COMPILE_ERROR,
  INTERPRET_RUNTIME_ERROR,
}

export default `;;wasm
${enumToGlobals(INTERPRET_RESULT)}
(; typedef struct {
  i32 *function;
  i32 *ip;
  i32 *slot;
} CallFrame ;)
(global $call_frames
  (mut i32)
  (i32.const 0))
(global $frame_count
  (mut i32)
  (i32.const 0))
(func $read_byte
  (param $frame i32)
  (result i32)
  (call $set_ip
    (local.get $frame)
    (i32.add
      (call $get_ip
        (local.get $frame))
      (i32.const 1)))
  (i32.load8_u
    (call $get_ip
      (local.get $frame))))
(func $read_short
  (param $frame i32)
  (result i32)
  (local $ip i32)
  (local.set $ip
    (call $get_ip
      (local.get $frame)))
  (call $set_ip
    (local.get $frame)
    (i32.add
      (local.get $ip)
      (i32.const 2)))
  (i32.load16_u
    (i32.add
      (local.get $ip)
      (i32.const 1))))
(func $add_frame
  (param $funcptr i32)
  (param $ip i32)
  (param $stackptr i32)
  (result i32)
  (local $frameptr i32)
  (local.set $frameptr
    (i32.add
      (global.get $call_frames)
      (i32.mul
        (global.get $frame_count)
        (i32.const 12))))
  (i32.store
    (local.get $frameptr) ;; *function
    (local.get $funcptr))
  (i32.store
    (i32.add
      (local.get $frameptr)
      (i32.const 4)) ;; *ip
    (local.get $ip))
  (i32.store
    (i32.add
      (local.get $frameptr)
      (i32.const 8)) ;; *slot
    (local.get $stackptr))
  (global.set $frame_count
    (i32.add
      (global.get $frame_count)
      (i32.const 1)))
  (local.get $frameptr))
(func $get_ip
  (param $frameptr i32)
  (result i32)
  (i32.load
    (i32.add
      (local.get $frameptr)
      (i32.const 4)))) ;; *ip
(func $set_ip
  (param $frameptr i32)
  (param $ip i32)
  (i32.store
    (i32.add
      (local.get $frameptr)
      (i32.const 4)) ;; *ip
    (local.get $ip)))
(func $get_slot
  (param $frameptr i32)
  (param $i i32)
  (result f64)
  (f64.load
    (i32.add
      (i32.add
        (local.get $frameptr)
        (i32.const 8)) ;; *slot
      (i32.mul
        (local.get $i)
        (i32.const 8)))))
(func $set_slot
  (param $frameptr i32)
  (param $i i32)
  (param $v f64)
  (f64.store
    (i32.add
      (i32.add
        (local.get $frameptr)
        (i32.const 8)) ;; *slot
      (i32.mul
        (local.get $i)
        (i32.const 8)))
    (local.get $v)))
(func $interpret
  (param $srcptr i32)
  (result i32)
  (local $function f64)
  (local $frame i32)
  (local $code i32)
  (local $tmp f64)
  (local $offset i32)
  (local $result i32)
  (global.set $call_frames
    (call $alloc
      (i32.const 192)))
  (local.set $function
    (call $compile
      (local.get $srcptr)))
  (call $init_stack)
  (call $push
    (local.get $function))
  (local.set $frame
    (call $add_frame
      (call $as_obj
        (local.get $function))
      (call $get_codeptr
        (call $get_chunk
          (local.get $function))
        (i32.const 0))
      (i32.add
        (global.get $stack)
        (i32.const 4))))
  (call $dissasemble
    (call $get_chunk
      (local.get $function)))
(block $out
    (loop $run
      (local.set $code
        (i32.load8_u
          (call $get_ip
            (local.get $frame))))
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
            (call $read_byte
              (local.get $frame))))
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
          (call $get_slot
            (local.get $frame)
            (call $read_byte
              (local.get $frame))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_GET_GLOBAL,
        `;;wasm
        (call $push
          (call $table_get
            (call $get_value
              (call $read_byte
                (local.get $frame)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_DEFINE_GLOBAL,
        `;;wasm
        (call $table_set
          (call $get_value
            (call $read_byte
              (local.get $frame)))
          (call $pop))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_LOCAL,
        `;;wasm
        (call $set_slot
          (local.get $frame)
          (call $read_byte
            (local.get $frame))
          (call $peek))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_GLOBAL,
        `;;wasm
        (call $table_set ;; todo: check if not exists (new key)
          (call $get_value
            (call $read_byte
              (local.get $frame)))
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
          (call $read_short
            (local.get $frame)))
        (call $set_ip
          (local.get $frame)
          (i32.add
            (call $get_ip
              (local.get $frame))
            (local.get $offset)))
        (br $break)`,
      ],
      [
        OP_CODES.OP_JUMP_IF_FALSE,
        `;;wasm
        (local.set $offset
          (call $read_short
            (local.get $frame)))
        (if
          (i32.eqz
            (call $as_bool
              (call $peek)))
          (then
            (call $set_ip
              (local.get $frame)
              (i32.add
                (call $get_ip
                  (local.get $frame))
                (local.get $offset)))))
            (br $break)`,
      ],
      [
        OP_CODES.OP_LOOP,
        `;;wasm
        (local.set $offset
          (call $read_short
            (local.get $frame)))
        (call $set_ip
          (local.get $frame)
          (i32.sub
            (call $get_ip
              (local.get $frame))
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
      (call $set_ip
        (local.get $frame)
        (i32.add
          (call $get_ip
            (local.get $frame))
          (i32.const 1)))
      (br $run)
      (local.set $result
        (global.get $INTERPRET_RUNTIME_ERROR))))
    (local.get $result))
`;
