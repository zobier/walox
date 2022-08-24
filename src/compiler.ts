import { enumToGlobals, indent, watSwitch } from "./common";
import { TOKENS } from './scanner';

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
(func $check
  (param $token i32)
  (result i32)
  (i32.eq
    (local.get $token)
    (global.get $current)))
(func $match_token
  (param $token i32)
  (result i32)
  (if
    (i32.eqz
      (call $check
        (local.get $token)))
    (then
      (return
        (i32.const 0))))
  (call $advance)
  (i32.const 1))
(func $get_precedence
  (param $operator i32)
  (result i32)
  (local $result i32)
${indent(watSwitch(
  `;;wasm
  (local.get $operator)`,
  {
    [TOKENS.TOKEN_PLUS]: '',
    [TOKENS.TOKEN_MINUS]: `;;wasm
    (local.set $result
      (global.get $PREC_TERM))
    (br $break)`,
    [TOKENS.TOKEN_STAR]: '',
    [TOKENS.TOKEN_SLASH]: `;;wasm
    (local.set $result
      (global.get $PREC_FACTOR))
    (br $break)`,
    [TOKENS.TOKEN_BANG_EQUAL]: '',
    [TOKENS.TOKEN_EQUAL_EQUAL]: `;;wasm
    (local.set $result
      (global.get $PREC_EQUALITY))
    (br $break)`,
    [TOKENS.TOKEN_GREATER]: '',
    [TOKENS.TOKEN_GREATER_EQUAL]: '',
    [TOKENS.TOKEN_LESS]: '',
    [TOKENS.TOKEN_LESS_EQUAL]: `;;wasm
    (local.set $result
      (global.get $PREC_COMPARISON))
    (br $break)`,
  }, `;;wasm
  (local.set $result
    (global.get $PREC_NONE))`), 2)}
  (local.get $result))
(func $parse_precedence
  (param $precedence i32)
  (call $advance)
${indent(watSwitch(
    `;;wasm
    (global.get $previous)`,
    {
      [TOKENS.TOKEN_LEFT_PAREN]: `;;wasm
    (call $grouping)
    (br $break)`,
      [TOKENS.TOKEN_NUMBER]: `;;wasm
    (call $number)
    (br $break)`,
      [TOKENS.TOKEN_STRING]: `;;wasm
    (call $string)
    (br $break)`,
      [TOKENS.TOKEN_MINUS]: '',
      [TOKENS.TOKEN_BANG]: `;;wasm
    (call $unary)
    (br $break)`,
      [TOKENS.TOKEN_FALSE]: '',
      [TOKENS.TOKEN_TRUE]: '',
      [TOKENS.TOKEN_NIL]: `;;wasm
    (call $literal)
    (br $break)`,
    }), 2)} ;; default should be "expect expression" error
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
      `;;wasm
      (global.get $previous)`,
      {
        [TOKENS.TOKEN_PLUS]: '',
        [TOKENS.TOKEN_MINUS]: '',
        [TOKENS.TOKEN_STAR]: '',
        [TOKENS.TOKEN_SLASH]: '',
        [TOKENS.TOKEN_BANG_EQUAL]: '',
        [TOKENS.TOKEN_EQUAL_EQUAL]: '',
        [TOKENS.TOKEN_GREATER]: '',
        [TOKENS.TOKEN_GREATER_EQUAL]: '',
        [TOKENS.TOKEN_LESS]: '',
        [TOKENS.TOKEN_LESS_EQUAL]: `;;wasm
        (call $binary)
        (br $break)`,
      }), 8)}
        (br $infix)))
  )
(func $expression
  (call $parse_precedence
    (global.get $PREC_ASSIGNMENT)))
(func $print_statement
  (call $expression)
  (call $consume
    (global.get $TOKEN_SEMICOLON))
  (call $write_chunk
    (global.get $OP_PRINT)))
(func $declaration
  (call $statement))
(func $statement
  (if
    (call $match_token
      (global.get $TOKEN_PRINT))
    (then
      (call $print_statement))))
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
        `;;wasm
      (local.get $operator)`,
        {
          [TOKENS.TOKEN_MINUS]: `;;wasm
    (call $write_chunk
      (global.get $OP_NEGATE))
    (br $break)`,
          [TOKENS.TOKEN_BANG]: `;;wasm
    (call $write_chunk
      (global.get $OP_NOT))
    (br $break)`,
        }), 2)}
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
          `;;wasm
      (local.get $operator)`,
          {
            [TOKENS.TOKEN_PLUS]: `;;wasm
    (call $write_chunk
      (global.get $OP_ADD))
    (br $break)`,
            [TOKENS.TOKEN_MINUS]: `;;wasm
    (call $write_chunk
      (global.get $OP_SUBTRACT))
    (br $break)`,
            [TOKENS.TOKEN_STAR]: `;;wasm
    (call $write_chunk
      (global.get $OP_MULTIPLY))
    (br $break)`,
            [TOKENS.TOKEN_SLASH]: `;;wasm
    (call $write_chunk
      (global.get $OP_DIVIDE))
    (br $break)`,
            [TOKENS.TOKEN_BANG_EQUAL]: `;;wasm
    (call $write_chunk
      (global.get $OP_NOT_EQUAL))
    (br $break)`,
            [TOKENS.TOKEN_EQUAL_EQUAL]: `;;wasm
    (call $write_chunk
      (global.get $OP_EQUAL))
    (br $break)`,
            [TOKENS.TOKEN_GREATER]: `;;wasm
    (call $write_chunk
      (global.get $OP_GREATER))
    (br $break)`,
            [TOKENS.TOKEN_GREATER_EQUAL]: `;;wasm
    (call $write_chunk
      (global.get $OP_NOT_LESS))
    (br $break)`,
            [TOKENS.TOKEN_LESS]: `;;wasm
    (call $write_chunk
      (global.get $OP_LESS))
    (br $break)`,
            [TOKENS.TOKEN_LESS_EQUAL]: `;;wasm
    (call $write_chunk
      (global.get $OP_NOT_GREATER))
    (br $break)`,
          }), 2)}
  )
(func $literal
  (local $literal i32)
  (local.set $literal
    (global.get $previous))
${indent(watSwitch(
            `;;wasm
      (local.get $literal)`,
            {
              [TOKENS.TOKEN_FALSE]: `;;wasm
    (call $write_chunk
      (global.get $OP_FALSE))
    (br $break)`,
              [TOKENS.TOKEN_TRUE]: `;;wasm
    (call $write_chunk
      (global.get $OP_TRUE))
    (br $break)`,
              [TOKENS.TOKEN_NIL]: `;;wasm
    (call $write_chunk
      (global.get $OP_NIL))
    (br $break)`,
            }), 2)}
  )
(func $compile
  (param $srcptr i32)
  (call $init_scanner
    (local.get $srcptr))
  (call $advance)
  (block $out
    (loop $not_eof
      (if
        (call $match_token
          (global.get $TOKEN_EOF))
        (then
          (br $out)))
      (call $declaration)))
  (call $write_chunk
    (global.get $OP_RETURN))
  )
`;
