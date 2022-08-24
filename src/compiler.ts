import { enumToGlobals } from "./common";

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
${enumToGlobals(PRECEDENCE)}
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
(func $not_empty
  (param $opstack i32)
  (result i32)
  (i32.gt_u
    (i32.load
      (local.get $opstack))
    (i32.add
      (local.get $opstack)
      (i32.const 4))))
(func $get_prec
  (param $operator i32)
  (result i32)
  (local $result i32)
  (block $out
${Object.entries({
  '$OP_SUBTRACT': '$PREC_TERM',
  '$OP_ADD': '$PREC_TERM',
  '$OP_DIVIDE': '$PREC_FACTOR',
  '$OP_MULTIPLY': '$PREC_FACTOR',
  '$OP_NEGATE': '$PREC_UNARY',
  '$OP_NOT': '$PREC_UNARY',
  '$OP_NOT_EQUAL': '$PREC_EQUALITY',
  '$OP_EQUAL': '$PREC_EQUALITY',
  '$OP_GREATER': '$PREC_COMPARISON',
  '$OP_NOT_LESS': '$PREC_COMPARISON',
  '$OP_LESS': '$PREC_COMPARISON',
  '$OP_NOT_GREATER': '$PREC_COMPARISON',
}).map(([op, prec]) => `;;wasm
    (if
      (i32.eq
        (local.get $operator)
        (global.get ${op}))
      (then
        (local.set $result
          (global.get ${prec}))
        (br $out)))
`).join('')})
  (local.get $result))
(func $compile
  (param $srcptr i32)
  (local $token i32)
  (local $start i32)
  (local $len i32)
  (local $opstack i32)
  (local $op i32)
  (local $prec i32)
  (local $prev i32)
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
      (local.set $prev
        (local.get $token))
      (local.set $token
        (local.set $start
          (local.set $len
            (call $scan_token))))
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
                (local.get $start)
                (local.get $len))))
          (br $run)))
${Object.entries({
  '$TOKEN_NIL': '$OP_NIL',
  '$TOKEN_TRUE': '$OP_TRUE',
  '$TOKEN_FALSE': '$OP_FALSE',
}).map(([token, op]) => `;;wasm
    (if
      (i32.eq
        (local.get $token)
        (global.get ${token}))
      (then
        (call $write_chunk
          (global.get ${op}))
        (br $run)))
`).join('')}
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_LEFT_PAREN))
        (then
          (call $pushop
            (local.get $opstack)
            (global.get $OP_GROUP))
          (br $run)))
      (if
        (i32.eq
          (local.get $token)
          (global.get $TOKEN_RIGHT_PAREN))
        (then
          (loop $group
            (if
              (i32.and
                (call $not_empty
                  (local.get $opstack))
                (i32.ne
                  (call $peekop
                    (local.get $opstack))
                  (global.get $OP_GROUP)))
              (then
                (call $write_chunk
                  (call $popop
                    (local.get $opstack)))
                (br $group))))
          (call $popop ;; should assert group op
            (local.get $opstack))
          (br $run)))
      (if
        (i32.and
          (i32.eq
            (local.get $token)
            (global.get $TOKEN_MINUS))
          (i32.and
            (i32.ne
              (local.get $prev)
              (global.get $TOKEN_NUMBER))
            (i32.ne
              (local.get $prev)
              (global.get $TOKEN_RIGHT_PAREN))))
        (then
          (call $pushop
            (local.get $opstack)
            (global.get $OP_NEGATE))
          (br $run)))
      (block $switch_op
${Object.entries({
  '$TOKEN_MINUS': '$OP_SUBTRACT',
  '$TOKEN_PLUS': '$OP_ADD',
  '$TOKEN_SLASH': '$OP_DIVIDE',
  '$TOKEN_STAR': '$OP_MULTIPLY',
  '$TOKEN_BANG': '$OP_NOT',
  '$TOKEN_BANG_EQUAL': '$OP_NOT_EQUAL',
  '$TOKEN_EQUAL_EQUAL': '$OP_EQUAL',
  '$TOKEN_GREATER': '$OP_GREATER',
  '$TOKEN_GREATER_EQUAL': '$OP_NOT_LESS',
  '$TOKEN_LESS': '$OP_LESS',
  '$TOKEN_LESS_EQUAL': '$OP_NOT_GREATER',
}).map(([token, op]) => `;;wasm
        (if
          (i32.eq
            (local.get $token)
            (global.get ${token}))
          (then
            (local.set $op
              (global.get ${op}))
            (local.set $prec
              (call $get_prec
                (local.get $op)))
            (br $switch_op)))
`).join('')}
      )
      (loop $while_prec
        (if
          (i32.and
            (call $not_empty
              (local.get $opstack))
            (i32.ge_u
              (call $get_prec
                (call $peekop
                  (local.get $opstack)))
              (local.get $prec)))
          (then
            (call $write_chunk
              (call $popop
                (local.get $opstack)))
            (br $while_prec))))
      (call $pushop
        (local.get $opstack)
        (local.get $op))
      (br $run)))
  (loop $while_ops
    (call $write_chunk
      (call $popop
        (local.get $opstack)))
    (br_if $while_ops
      (call $not_empty
        (local.get $opstack))))
  (call $write_chunk
    (global.get $OP_RETURN)))
`;
