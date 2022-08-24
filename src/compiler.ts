export enum PRECEDENCE {
  PREC_NONE,
  PREC_ASSIGNMENT,  // =
  PREC_OR,          // or
  PREC_AND,         // and
  PREC_EQUALITY,    // == !=
  PREC_COMPARISON,  // < > <= >=
  PREC_TERM,        // + -
  PREC_FACTOR,      // * /
  PREC_UNARY,       // ! -
  PREC_CALL,        // . ()
  PREC_PRIMARY,
}

export default `;;wasm
(func $pushop
  (param $opstack i32)
  (param $value i32)
  (local $top_of_stack i32)
  (local.set $top_of_stack
    (i32.load
      (local.get $opstack)))
  (i32.store
    (local.get $top_of_stack)
    (local.get $value))
  (i32.store
    (local.get $opstack)
    (i32.add
      (local.get $top_of_stack)
      (i32.const 4))))
(func $popop
  (param $opstack i32)
  (result i32)
  (local $top_of_stack i32)
  (local.set $top_of_stack
    (i32.sub
      (i32.load
        (local.get $opstack))
      (i32.const 4)))
  (i32.store
    (local.get $opstack)
    (local.get $top_of_stack))
  (i32.load
    (local.get $top_of_stack)))
(func $peekop
  (param $opstack i32)
  (result i32)
  (i32.load ;; needs bounds check
    (i32.sub
      (i32.load
        (local.get $opstack))
      (i32.const 4))))
(func $compile
  (param $srcptr i32)
  (local $token i32)
  (local $opstack i32)
  (call $init_scanner
    (local.get $srcptr))
  (local.set $opstack
    (call $alloc
      (i32.const 256)))
  (i32.store
    (local.get $opstack)
    (i32.add
      (local.get $opstack)
      (i32.const 4)))
  (block $out
    (loop $run
      (local.set $token
        (call $scan_token))
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_EOF))
        (then
          (br $out)))
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_NUMBER))
        (then
          (call $write_chunk
            (global.get $OP_CONSTANT))
          (call $write_chunk
            (call $write_value_array
              (call $stringToDouble
                (global.get $start)
                (global.get $len))))
          (br $run)))
${Object.entries({
  '$TOKEN_MINUS': '$OP_SUBTRACT',
  '$TOKEN_PLUS': '$OP_ADD',
  '$TOKEN_SLASH': '$OP_DIVIDE',
  '$TOKEN_STAR': '$OP_MULTIPLY',
}).map(([token, op]) => `;;wasm
      (if
        (i32.eq
          (local.get $token)
          (global.get ${token}))
        (then
          (call $pushop ;; todo: shunting yard algorithm
            (local.get $opstack)
            (global.get ${op}))
          (br $run)))
`).join('')}
      (br $run)))
  (loop $while_ops
    (call $write_chunk
      (call $popop
        (local.get $opstack)))
    (br_if $while_ops
      (i32.gt_u
        (i32.load
          (local.get $opstack))
        (i32.add
          (local.get $opstack)
          (i32.const 4)))))
  (call $write_chunk
    (global.get $OP_RETURN)))
`;
