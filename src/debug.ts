import { OP_CODES } from './chunk';
import { watSwitch } from './common';

// todo: add the rest of the instructions to the disassembler
export default `;;wasm
(func $dissasemble
  (param $chunk i32)
  (local $chunkptr i32)
  (local $count i32)
  (local $i i32)
  (local.set $chunkptr
    (local.get $chunk))
  (local.set $count
    (i32.load
      (local.get $chunkptr)))
  (local.set $i
    (i32.const 0))
  (loop $loop
    (local.set $i
      (call $dissassemble_instruction
        (local.get $chunk)
        (local.get $i)))
    (br_if $loop
      (i32.lt_s
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 1)))
        (local.get $count)))))
(func $dissassemble_current
  (param $frameptr i32)
  (local $chunk i32)
  (local $i i32)
  (local.set $chunk
    (call $get_chunk
      (call $obj_val
        (i32.load
          (local.get $frameptr)))))
  (local.set $i
    (i32.sub
      (call $get_ip
        (local.get $frameptr))
      (call $get_codeptr
        (local.get $chunk)
        (i32.const 0))))
    (drop
      (call $dissassemble_instruction
        (local.get $chunk)
        (local.get $i))))
(func $dissassemble_instruction
  (param $chunk i32)
  (param $i i32)
  (result i32)
  (local $code i32)
  (local $function f64)
  (local $upvalue_count i32)
  (local $j i32)
  (local.set $code
    (i32.load8_u
      (call $get_codeptr
        (local.get $chunk)
        (local.get $i))))
  (call $logOpCode
    (local.get $code))
${watSwitch(
  `;;wasm
  (local.get $code)`,
  [
    [OP_CODES.OP_CALL, ''],
    [OP_CODES.OP_GET_LOCAL, ''],
    [
      OP_CODES.OP_SET_LOCAL,
      `;;wasm
      (call $logNum
        (i32.load8_u
          (call $get_codeptr
            (local.get $chunk)
            (local.tee $i
              (i32.add
                (local.get $i)
                (i32.const 1))))))
      (br $break)`,
    ],
    [OP_CODES.OP_DEFINE_GLOBAL, ''],
    [OP_CODES.OP_GET_GLOBAL, ''],
    [OP_CODES.OP_SET_GLOBAL, ''],
    [OP_CODES.OP_CLASS, ''],
    [OP_CODES.OP_SET_PROPERTY, ''],
    [OP_CODES.OP_GET_PROPERTY, ''],
    [
      OP_CODES.OP_CONSTANT,
      `;;wasm
      (call $print_value
        (call $get_value
          (i32.load8_u
            (call $get_codeptr
              (local.get $chunk)
              (local.tee $i
                (i32.add
                  (local.get $i)
                  (i32.const 1)))))))
      (br $break)`,
    ],
    [
      OP_CODES.OP_CLOSURE, // todo: print upvalues
      `;;wasm
      (local.set $function
        (call $get_value
          (i32.load8_u
            (call $get_codeptr
              (local.get $chunk)
              (local.tee $i
                (i32.add
                  (local.get $i)
                  (i32.const 1)))))))
      (call $print_value
        (local.get $function))
      (local.set $upvalue_count
        (call $get_upvalue_count
          (local.get $function)))
      (local.set $j
        (i32.const 0))
      (block $out
        (loop $loop
          (br_if $out
            (i32.ge_u
              (local.get $j)
              (local.get $upvalue_count)))
          (call $logNum
            (i32.load8_u
              (call $get_codeptr
                (local.get $chunk)
                (local.tee $i
                  (i32.add
                    (local.get $i)
                    (i32.const 1))))))
          (call $logNum
            (i32.load8_u
              (call $get_codeptr
                (local.get $chunk)
                (local.tee $i
                  (i32.add
                    (local.get $i)
                    (i32.const 1))))))
          (local.set $j
            (i32.add
              (local.get $j)
              (i32.const 1)))
          (br $loop)))
      (br $break)`,
    ],
    [OP_CODES.OP_JUMP, ''],
    [
      OP_CODES.OP_JUMP_IF_FALSE,
      `;;wasm
      (call $logNum
        (i32.load16_u
          (call $get_codeptr
            (local.get $chunk)
            (i32.add
              (local.get $i)
              (i32.const 1)))))
      (local.set $i
        (i32.add
          (local.get $i)
          (i32.const 2)))
      (br $break)`,
    ],
    [
      OP_CODES.OP_LOOP,
      `;;wasm
      (call $logNum
        (i32.sub
          (i32.const 0)
          (i32.load16_u
            (call $get_codeptr
              (local.get $chunk)
              (i32.add
                (local.get $i)
                (i32.const 1))))))
      (local.set $i
        (i32.add
          (local.get $i)
          (i32.const 2)))
      (br $break)`,
    ],
  ],
)}
  (local.get $i))
(func $print_frame
  (param $frameptr i32)
  (local $i i32)
  (local.set $i
    (i32.load
      (i32.add
        (local.get $frameptr)
        (i32.const 8)))) ;; *slot
  (call $print_value
    (f64.load
      (local.get $i)))
  (loop $loop
    (br_if $loop
      (i32.lt_s
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 8)))
        (i32.load
          (global.get $stack)))))) ;; *top_of_stack
`;
