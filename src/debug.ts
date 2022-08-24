import { OP_CODES } from './chunk';
import { watSwitch } from './common';

// todo: add the rest of the instructions to the disassembler
export default `;;wasm
(func $dissasemble
  (param $chunk i32)
  (local $chunkptr i32)
  (local $count i32)
  (local $i i32)
  (local $code i32)
  (local.set $chunkptr
    (local.get $chunk))
  (local.set $count
    (i32.load
      (local.get $chunkptr)))
  (local.set $i
    (i32.const 0))
  (loop $loop
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
    [OP_CODES.OP_DEFINE_GLOBAL, ''],
    [OP_CODES.OP_GET_GLOBAL, ''],
    [OP_CODES.OP_SET_GLOBAL, ''],
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
    (br_if $loop
      (i32.lt_s
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 1)))
        (local.get $count)))))
`;
