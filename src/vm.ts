import { indent, struct, watSwitch } from './common';
import { OP_CODES } from './chunk';
import { OBJ_TYPE } from './object';

export enum INTERPRET_RESULT {
  INTERPRET_OK = 1,
  INTERPRET_COMPILE_ERROR,
  INTERPRET_RUNTIME_ERROR,
}

const CallFrame = struct([
  ['*closure', 'i32'],
  ['*ip', 'i32'],
  ['*slot', 'i32'],
]);

export default `;;wasm
(global $call_frames
  (mut i32)
  (i32.const 0))
(global $frame_count
  (mut i32)
  (i32.const 0))
(global $open_upvalues
  (mut f64) ;; perhaps change to pointer
  (f64.const 0))
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
  (param $closure i32)
  (param $ip i32)
  (param $stackptr i32)
  (result i32)
  (local $frameptr i32)
  (local.set $frameptr
    (i32.add
      (global.get $call_frames)
      (i32.mul
        (global.get $frame_count)
        (i32.const ${CallFrame.size()}))))
  ${CallFrame.set(
    '*closure',
    `;;wasm
    (local.get $frameptr)`,
    `;;wasm
    (local.get $closure)`,
  )}
  ${CallFrame.set(
    '*ip',
    `;;wasm
    (local.get $frameptr)`,
    `;;wasm
    (local.get $ip)`,
  )}
  ${CallFrame.set(
    '*slot',
    `;;wasm
    (local.get $frameptr)`,
    `;;wasm
    (local.get $stackptr)`,
  )}
  (global.set $frame_count
    (i32.add
      (global.get $frame_count)
      (i32.const 1)))
  (local.get $frameptr))
(func $get_ip
  (param $frameptr i32)
  (result i32)
  ${CallFrame.get(
    '*ip',
    `;;wasm
    (local.get $frameptr)`,
  )})
(func $set_ip
  (param $frameptr i32)
  (param $ip i32)
  ${CallFrame.set(
    '*ip',
    `;;wasm
    (local.get $frameptr)`,
    `;;wasm
    (local.get $ip)`
  )})
(func $get_slotptr
  (param $frameptr i32)
  (param $i i32)
  (result i32)
  (i32.add
    ${CallFrame.get(
      '*slot',
      `;;wasm
      (local.get $frameptr)`,
    )}
    (i32.mul
      (local.get $i)
      (i32.const 8))))
(func $set_slot
  (param $frameptr i32)
  (param $i i32)
  (param $v f64)
  (f64.store
    (i32.add
      ${CallFrame.get(
        '*slot',
        `;;wasm
        (local.get $frameptr)`,
      )}
      (i32.mul
        (local.get $i)
        (i32.const 8)))
    (local.get $v)))
(func $call_value
  (param $frame i32)
  (param $callee f64)
  (param $arg_count i32)
  (result i32)
;; todo: runtime error if not fun or arg_count != arity
  ${watSwitch(
    `;;wasm
    (call $get_obj_type
      (local.get $callee))`,
    [
      [
        OBJ_TYPE.OBJ_CLASS,
        `;;wasm
        (call $push ;; should go to stackTop[-argCount - 1]
          (call $new_instance
            (call $as_obj
              (local.get $callee))))
        (br $break)`,
      ],
      [
        OBJ_TYPE.OBJ_CLOSURE,
        `;;wasm
;;        (call $dissasemble
;;          (call $get_chunk
;;            (call $get_closure_function
;;              (local.get $callee))))
        (local.set $frame
          (call $add_frame
            (call $as_obj
              (local.get $callee))
            (call $get_codeptr
              (call $get_chunk
                (call $get_closure_function
                  (local.get $callee)))
              (i32.const 0))
            (i32.sub
              (i32.load
                (global.get $stack)) ;; *top_of_stack
              (i32.mul
                (i32.add
                  (local.get $arg_count)
                  (i32.const 1))
                (i32.const 8)))))
        (br $break)`,
      ],
      [
        OBJ_TYPE.OBJ_NATIVE,
        `;;wasm
        (call $push
          (call $native
            (call $get_native
              (local.get $callee))))
        (br $break)`,
      ],
    ]
  )}
  (local.get $frame))
(func $capture_upvalue
  (param $localptr i32)
  (result f64)
  (local $prev_upvalue f64)
  (local $upvalue f64)
  (local $created_upvalue f64)
  (local.set $upvalue
    (global.get $open_upvalues))
  (block $out
    (loop $find_upvalue
      (br_if $out
        (if
          (result i32)
          (f64.eq
            (local.get $upvalue)
            (f64.const 0))
          (then
            (i32.const 1))
          (else
            (i32.le_u
              (call $get_upvalue_location
                (local.get $upvalue))
              (local.get $localptr)))))
      (local.set $prev_upvalue
        (local.get $upvalue))
      (local.set $upvalue
        (call $get_upvalue_next
          (local.get $upvalue)))
      (br $find_upvalue)))
  (if
    (if
      (result i32)
      (f64.ne
        (local.get $upvalue)
        (f64.const 0))
      (then
        (i32.const 1))
      (else
        (i32.eq
          (call $get_upvalue_location
            (local.get $upvalue))
          (local.get $localptr))))
      (then
        (return
          (local.get $upvalue))))
  (local.set $created_upvalue
    (call $new_upvalue
      (local.get $localptr)))
  (call $set_upvalue_next
    (local.get $created_upvalue)
    (local.get $upvalue))
  (if
    (f64.eq
      (local.get $prev_upvalue)
      (f64.const 0))
    (then
      (global.set $open_upvalues
        (local.get $created_upvalue)))
    (else
      (call $set_upvalue_next
        (local.get $prev_upvalue)
        (local.get $created_upvalue))))
  (local.get $created_upvalue))
(func $close_upvalues
  (param $lastptr i32)
  (local $upvalue f64)
  (local.set $upvalue
    (global.get $open_upvalues))
  (block $out
    (loop $find_upvalue
      (br_if $out
        (if
          (result i32)
          (f64.eq
            (local.get $upvalue)
            (f64.const 0))
          (then
            (i32.const 1))
          (else
            (i32.lt_u
              (call $get_upvalue_location
                (local.get $upvalue))
              (local.get $lastptr)))))
      (call $set_upvalue_closed
        (local.get $upvalue))
      (local.set $upvalue
        (call $get_upvalue_next
          (local.get $upvalue)))
      (br $find_upvalue)))
  )
(func $capture_upvalues
  (param $closure f64)
  (param $frameptr i32)
  (local $upvalue_count i32)
  (local $i i32)
  (local $is_local i32)
  (local $index i32)
  (local $upvalue f64)
  (local.set $upvalue_count
    (call $get_upvalue_count
      (call $get_closure_function
        (local.get $closure))))
  (local.set $i
    (i32.const 0))
  (block $out
    (loop $loop
      (br_if $out
        (i32.ge_u
          (local.get $i)
          (local.get $upvalue_count)))
      (local.set $is_local
        (call $read_byte
          (local.get $frameptr)))
      (local.set $index
        (call $read_byte
          (local.get $frameptr)))
      (if
        (local.get $is_local)
        (then
          (local.set $upvalue
            (call $capture_upvalue
              (call $get_slotptr
                (local.get $frameptr)
                (local.get $index)))))
        (else
          (local.set $upvalue
            (call $get_upvalue
              (call $obj_val
                (i32.load
                  (local.get $frameptr)))
              (local.get $index)))))
      (call $set_upvalue
        (local.get $closure)
        (local.get $i)
        (local.get $upvalue))
      (local.set $i
        (i32.add
          (local.get $i)
          (i32.const 1)))
      (br $loop))))
(func $interpret
  (param $srcptr i32)
  (result i32)
  (local $closure f64)
  (local $frame i32)
  (local $code i32)
  (local $tmp f64)
  (local $offset i32)
  (local $arg_count i32)
  (local $result i32)
  (global.set $call_frames
    (call $alloc
      (i32.const 192)))
  (local.set $closure
    (call $new_closure
      (call $as_obj
        (call $compile
          (local.get $srcptr)))))
  (call $init_stack)
  (call $push
    (local.get $closure))
  (local.set $frame
    (call $call_value
      (local.get $frame)
      (local.get $closure)
      (i32.const 0)))
  (block $out
    (loop $run
;;      (call $dissassemble_current
;;        (local.get $frame))
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
          (f64.load
            (call $get_slotptr
              (local.get $frame)
              (call $read_byte
                (local.get $frame)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_LOCAL,
        `;;wasm
        (call $set_slot
          (local.get $frame)
          (call $read_byte
            (local.get $frame))
          (f64.load
            (call $peek
              (i32.const 0))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_GET_GLOBAL,
        `;;wasm
        (call $push
          (call $table_get
            (global.get $table)
            (call $get_value
              (call $read_byte
                (local.get $frame)))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_DEFINE_GLOBAL,
        `;;wasm
        (call $table_set
          (global.get $table)
          (call $get_value
            (call $read_byte
              (local.get $frame)))
          (call $pop))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_GLOBAL,
        `;;wasm
        (call $table_set ;; todo: check if not exists (new key)
          (global.get $table)
          (call $get_value
            (call $read_byte
              (local.get $frame)))
          (f64.load
            (call $peek
              (i32.const 0))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_GET_PROPERTY,
        `;;wasm
        (local.set $tmp
          (call $table_get
            (call $get_fields
              (f64.load
                (call $peek
                  (i32.const 0))))
            (call $get_value
              (call $read_byte
                (local.get $frame)))))
        ;; todo: error if undefined property or not instance
        (call $pop)
        (call $push
          (local.get $tmp))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_PROPERTY,
        `;;wasm
        (call $table_set
          (call $get_fields
            (f64.load
              (call $peek
                (i32.const 1))))
          (call $get_value
            (call $read_byte
              (local.get $frame)))
          (f64.load
            (call $peek
              (i32.const 0))))
        ;; todo: error if not instance
        (local.set $tmp
          (call $pop))
        (call $pop)
        (call $push
          (local.get $tmp))
        (br $break)`,
      ],
      [
        OP_CODES.OP_GET_UPVALUE,
        `;;wasm
        (call $push
          (f64.load
            (call $get_upvalue_location
              (call $get_upvalue
                (call $obj_val
                  (i32.load
                    (local.get $frame)))
                (call $read_byte
                  (local.get $frame))))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_SET_UPVALUE,
        `;;wasm
        (call $set_upvalue_location
          (call $get_upvalue
            (call $obj_val
              (i32.load
                (local.get $frame)))
            (call $read_byte
              (local.get $frame)))
          (call $peek
            (i32.const 0)))
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
            (call $is_obj_type
              (local.get $tmp)
              (i32.const ${OBJ_TYPE.OBJ_STRING}))
            (call $is_obj_type
              (f64.load
                (call $peek
                  (i32.const 0)))
              (i32.const ${OBJ_TYPE.OBJ_STRING})))
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
              (f64.load
                (call $peek
                  (i32.const 0)))))
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
        OP_CODES.OP_CALL,
        `;;wasm
        (local.set $arg_count
          (call $read_byte
            (local.get $frame)))
        (local.set $frame
          (call $call_value
            (local.get $frame)
            (f64.load
              (call $peek
                (local.get $arg_count)))
            (local.get $arg_count)))
        (br $run)`,
      ],
      [
        OP_CODES.OP_CLOSURE,
        `;;wasm
        (local.set $tmp
          (call $new_closure
            (call $as_obj
              (call $get_value
                (call $read_byte
                  (local.get $frame))))))
        (call $push
          (local.get $tmp))
        (call $capture_upvalues
          (local.get $tmp)
          (local.get $frame))
        (br $break)`,
      ],
      [
        OP_CODES.OP_CLOSE_UPVALUE,
        `;;wasm
        (call $close_upvalues
          (call $peek
            (i32.const 0)))
        (call $pop)
        (br $break)`,
      ],
      [
        OP_CODES.OP_RETURN,
        `;;wasm
        (local.set $tmp
          (call $pop))
        (call $close_upvalues
          (call $get_slotptr
            (local.get $frame)
            (i32.const 0)))
        (global.set $frame_count
          (i32.sub
            (global.get $frame_count)
            (i32.const 1)))
        (if
          (i32.eqz
            (global.get $frame_count))
          (then
            (call $pop)
            (local.set $result
              (i32.const ${INTERPRET_RESULT.INTERPRET_OK}))
              (br $out)))
        (i32.store
          (global.get $stack) ;; *top_of_stack
          ${CallFrame.get(
            '*slot',
            `;;wasm
            (local.get $frame)`,
          )})
        (call $push
          (local.get $tmp))
        (local.set $frame
          (i32.add
            (global.get $call_frames)
            (i32.mul
              (i32.sub
                (global.get $frame_count)
                (i32.const 1))
              (i32.const 12))))
        (br $break)`,
      ],
      [
        OP_CODES.OP_CLASS,
        `;;wasm
        (call $push
          (call $new_class
            (call $as_obj
              (call $get_value
                (call $read_byte
                  (local.get $frame))))))
        (br $break)
        `,
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
        (i32.const ${INTERPRET_RESULT.INTERPRET_RUNTIME_ERROR}))))
    (local.get $result))
`;
