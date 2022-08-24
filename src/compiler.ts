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
    '(global.get $TOKEN_BANG_EQUAL)': `;;wasm
    (local.set $result
      (global.get $PREC_EQUALITY))
    (br ${label})`,
    '(global.get $TOKEN_EQUAL_EQUAL)': `;;wasm
    (local.set $result
      (global.get $PREC_EQUALITY))
    (br ${label})`,
    '(global.get $TOKEN_GREATER)': `;;wasm
    (local.set $result
      (global.get $PREC_COMPARISON))
    (br ${label})`,
    '(global.get $TOKEN_GREATER_EQUAL)': `;;wasm
    (local.set $result
      (global.get $PREC_COMPARISON))
    (br ${label})`,
    '(global.get $TOKEN_LESS)': `;;wasm
    (local.set $result
      (global.get $PREC_COMPARISON))
    (br ${label})`,
    '(global.get $TOKEN_LESS_EQUAL)': `;;wasm
    (local.set $result
      (global.get $PREC_COMPARISON))
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
      '(global.get $TOKEN_STRING)': `;;wasm
    (call $string)
    (br ${label})`,
      '(global.get $TOKEN_BANG)': `;;wasm
    (call $unary)
    (br ${label})`,
      '(global.get $TOKEN_FALSE)': `;;wasm
    (call $literal)
    (br ${label})`,
      '(global.get $TOKEN_TRUE)': `;;wasm
    (call $literal)
    (br ${label})`,
      '(global.get $TOKEN_NIL)': `;;wasm
    (call $literal)
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
        '(global.get $TOKEN_BANG_EQUAL)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_EQUAL_EQUAL)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_GREATER)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_GREATER_EQUAL)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_LESS)': `;;wasm
        (call $binary)
        (br ${label})`,
        '(global.get $TOKEN_LESS_EQUAL)': `;;wasm
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
(func $string
  (call $write_chunk
    (global.get $OP_CONSTANT))
  (call $write_chunk
    (call $write_value_array
      (call $copy_string
        (i32.add
          (global.get $prev_start)
          (i32.const 4))
        (i32.sub
          (global.get $prev_len)
          (i32.const 2))))))
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
${indent(watSwitch(
        '$operator_switch',
        value => `;;wasm
    (i32.eq
      (local.get $operator)
      ${value})`,
        label => ({
          '(global.get $TOKEN_MINUS)': `;;wasm
    (call $write_chunk
      (global.get $OP_NEGATE))
    (br ${label})`,
          '(global.get $TOKEN_BANG)': `;;wasm
    (call $write_chunk
      (global.get $OP_NOT))
    (br ${label})`,
        })), 2)}
  )
(func $binary
  (local $operator i32)
  (local.set $operator
    (global.get $previous))
  (call $parse_precedence
    (i32.add
      (call $get_precedence
        (local.get $operator))
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
          '(global.get $TOKEN_BANG_EQUAL)': `;;wasm
    (call $write_chunk
      (global.get $OP_NOT_EQUAL))
    (br ${label})`,
          '(global.get $TOKEN_EQUAL_EQUAL)': `;;wasm
    (call $write_chunk
      (global.get $OP_EQUAL))
    (br ${label})`,
          '(global.get $TOKEN_GREATER)': `;;wasm
    (call $write_chunk
      (global.get $OP_GREATER))
    (br ${label})`,
          '(global.get $TOKEN_GREATER_EQUAL)': `;;wasm
    (call $write_chunk
      (global.get $OP_NOT_LESS))
    (br ${label})`,
          '(global.get $TOKEN_LESS)': `;;wasm
    (call $write_chunk
      (global.get $OP_LESS))
    (br ${label})`,
          '(global.get $TOKEN_LESS_EQUAL)': `;;wasm
    (call $write_chunk
      (global.get $OP_NOT_GREATER))
    (br ${label})`,
        })), 2)}
  )
(func $literal
  (local $literal i32)
  (local.set $literal
    (global.get $previous))
${indent(watSwitch(
        '$literal_switch',
        value => `;;wasm
    (i32.eq
      (local.get $literal)
      ${value})`,
        label => ({
          '(global.get $TOKEN_FALSE)': `;;wasm
    (call $write_chunk
      (global.get $OP_FALSE))
    (br ${label})`,
          '(global.get $TOKEN_TRUE)': `;;wasm
    (call $write_chunk
      (global.get $OP_TRUE))
    (br ${label})`,
          '(global.get $TOKEN_NIL)': `;;wasm
    (call $write_chunk
      (global.get $OP_NIL))
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
