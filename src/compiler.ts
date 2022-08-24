import { enumToGlobals, indent, watSwitch } from "./common";

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
(global $previous
  (mut i32)
  (i32.const 0))
(global $prev_start
  (mut i32)
  (i32.const 0))
(global $prev_len
  (mut i32)
  (i32.const 0))
(global $current
  (mut i32)
  (i32.const 0))
(global $cur_start
  (mut i32)
  (i32.const 0))
(global $cur_len
  (mut i32)
  (i32.const 0))
(func $advance
  (global.set $previous
    (global.get $current))
  (global.set $prev_start
    (global.get $cur_start))
  (global.set $prev_len
    (global.get $cur_len))
  (global.set $current
    (global.set $cur_start
      (global.set $cur_len
        (call $scan_token)))))
(func $consume
  (param $expected i32)
  (if
    (i32.eq
      (global.get $current)
      (local.get $expected))
    (then
      (call $advance))
    (else
      (call $tokenError
        (local.get $expected)
        (global.get $current)))))
(func $get_precedence
  (param $operator i32)
  (result i32)
  (local $result i32)
${indent(watSwitch(
  '$operator_switch',
  value => `;;wasm
    (i32.eq
      (local.get $operator)
      ${value})`,
  label => ({
    '(global.get $TOKEN_PLUS)': `;;wasm
    (local.set $result
      (global.get $PREC_TERM))
    (br ${label})`,
    '(global.get $TOKEN_MINUS)': `;;wasm
    (local.set $result
      (global.get $PREC_TERM))
    (br ${label})`,
    '(global.get $TOKEN_STAR)': `;;wasm
    (local.set $result
      (global.get $PREC_FACTOR))
    (br ${label})`,
    '(global.get $TOKEN_SLASH)': `;;wasm
    (local.set $result
      (global.get $PREC_FACTOR))
    (br ${label})`,
  }), `;;wasm
  (local.set $result
    (global.get $PREC_NONE))`), 2)}
  (local.get $result))
(func $parse_precedence
  (param $precedence i32)
  (call $advance)
${indent(watSwitch(
    '$prefix_switch',
    value => `;;wasm
    (i32.eq
      (global.get $previous)
      ${value})`,
    label => ({
      '(global.get $TOKEN_LEFT_PAREN)': `;;wasm
    (call $grouping)
    (br ${label})`,
      '(global.get $TOKEN_MINUS)': `;;wasm
    (call $unary)
    (br ${label})`,
      '(global.get $TOKEN_NUMBER)': `;;wasm
    (call $number)
    (br ${label})`,
    })), 2)} ;; default should be "expect expression" error
  (block $out
    (loop $infix
      (if
        (i32.ge_u
          (local.get $precedence)
          (call $get_precedence
            (global.get $current)))
        (then
          (br $out)))
        (call $advance)
${indent(watSwitch(
      '$infix_switch',
      value => `;;wasm
      (i32.eq
        (global.get $previous)
        ${value})`,
      label => ({
        '(global.get $TOKEN_PLUS)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_MINUS)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_STAR)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_SLASH)': `;;wasm
        (call $binary)
        (br ${label})`,
      })), 8)}
        (br $infix)))
  )
(func $expression
  (call $parse_precedence
    (global.get $PREC_ASSIGNMENT)))
(func $number
  (call $write_chunk
    (global.get $OP_CONSTANT))
  (call $write_chunk
    (call $write_value_array
      (call $stringToDouble
        (global.get $prev_start)
        (global.get $prev_len)))))
(func $grouping
  (call $expression)
  (call $consume
    (global.get $TOKEN_RIGHT_PAREN)))
(func $unary
  (local $operator i32)
  (local.set $operator
    (global.get $previous))
  (call $parse_precedence
    (global.get $PREC_UNARY))
  (if
    (i32.eq
      (local.get $operator)
      (global.get $TOKEN_MINUS))
    (then
      (call $write_chunk
        (global.get $OP_NEGATE)))))
(func $binary
  (local $operator i32)
  (local $precedence i32)
  (local.set $operator
    (global.get $previous))
  (local.set $precedence
    (call $get_precedence
      (local.get $operator)))
  (call $parse_precedence
    (i32.add
      (local.get $precedence)
      (i32.const 1)))
${indent(watSwitch(
        '$operator_switch',
        value => `;;wasm
    (i32.eq
      (local.get $operator)
      ${value})`,
        label => ({
          '(global.get $TOKEN_PLUS)': `;;wasm
    (call $write_chunk
      (global.get $OP_ADD))
    (br ${label})`,
          '(global.get $TOKEN_MINUS)': `;;wasm
    (call $write_chunk
      (global.get $OP_SUBTRACT))
    (br ${label})`,
          '(global.get $TOKEN_STAR)': `;;wasm
    (call $write_chunk
      (global.get $OP_MULTIPLY))
    (br ${label})`,
          '(global.get $TOKEN_SLASH)': `;;wasm
    (call $write_chunk
      (global.get $OP_DIVIDE))
    (br ${label})`,
        })), 2)}
  )
(func $compile
  (param $srcptr i32)
  (call $init_scanner
    (local.get $srcptr))
  (call $advance)
  (call $expression)
  (call $consume
    (global.get $TOKEN_EOF))
  (call $write_chunk
    (global.get $OP_RETURN))
  )
`;
