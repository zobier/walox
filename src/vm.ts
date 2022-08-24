import { enumToGlobals } from "./util";

export enum INTERPRET_RESULT {
  INTERPRET_OK = 1,
  INTERPRET_COMPILE_ERROR,
  INTERPRET_RUNTIME_ERROR,
};

export default `;;wasm
${enumToGlobals(INTERPRET_RESULT)}
(func $interpret
  (result i32)
  (local $ip i32)
  (local $code i32)
  (local $result i32)
  (local.set $ip
    (i32.const 0))
  (block $out
    (loop $run
      (local.set $code
        (i32.load8_u
          (call $get_codeptr
            (local.get $ip))))
      (if
        (i32.eq
          (local.get $code)
          (global.get $OP_RETURN))
        (then
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
