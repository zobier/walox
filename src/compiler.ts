import { enumToGlobals, indent, watSwitch } from './common';
import { TOKENS } from './scanner';

export enum PRECEDENCE {
  PREC_NONE,
  PREC_ASSIGNMENT, // =
  PREC_OR, // or
  PREC_AND, // and
  PREC_EQUALITY, // == !=
  PREC_COMPARISON, // < > <= >=
  PREC_TERM, // + -
  PREC_FACTOR, // * /
  PREC_UNARY, // ! -
  PREC_CALL, // . ()
  PREC_PRIMARY,
}

export default `;;wasm
${enumToGlobals(PRECEDENCE)}
(; typedef struct {
  i32 *name
  i32 depth
} Local ;)
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
(global $local_count
  (mut i32)
  (i32.const 0))
(global $scope_depth
  (mut i32)
  (i32.const 0))
(global $locals
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
${indent(
  watSwitch(
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
    },
    `;;wasm
    (local.set $result
      (global.get $PREC_NONE))`,
  ),
  2,
)}
  (local.get $result))
(func $parse_precedence
  (param $precedence i32)
  (call $advance)
${indent(
  watSwitch(
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
      [TOKENS.TOKEN_IDENTIFIER]: `;;wasm
      (call $variable)
      (br $break)`,
    },
  ),
  2,
)} ;; default should be "expect expression" error
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
${indent(
  watSwitch(
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
    },
  ),
  8,
)}
      (br $infix)))
  )
(func $identifier_constant
  (result i32)
  (call $write_value_array
    (call $copy_string
      (global.get $prev_start)
      (global.get $prev_len))))
(func $resolve_local
  (param $nameptr i32)
  (result i32)
  (local $i i32)
  (local $localptr i32)
  (local.set $i
    (i32.sub
      (global.get $local_count)
      (i32.const 1)))
  (block $out
    (loop $loop
      (br_if $out
        (i32.lt_s
          (local.get $i)
          (i32.const 0)))
      (if
        (local.tee $localptr
          (i32.load
            (i32.add
              (global.get $locals)
              (i32.mul
                (local.get $i)
                (i32.const 8))))) ;; *name
        (then
          (if
            (call $str_cmp
              (call $get_string
                (call $obj_val
                  (local.get $nameptr)))
              (call $get_string
                (call $obj_val
                  (local.get $localptr))))
            (then
              (return
                (local.get $i))))))
        (local.set $i
          (i32.sub
            (local.get $i)
            (i32.const 1)))
        (br $loop)))
  (i32.const -1))
(func $add_local
  (param $nameptr i32)
  (local $localptr i32)
  (local.set $localptr
    (i32.add
      (global.get $locals)
      (i32.mul
        (global.get $local_count) ;; should check this is < 256
        (i32.const 8)))) ;; *name
  (i32.store
    (local.get $localptr)
    (local.get $nameptr))
  (i32.store
    (i32.add
      (local.get $localptr)
      (i32.const 4)) ;; depth
    (global.get $scope_depth))
  (global.set $local_count
    (i32.add
      (global.get $local_count)
      (i32.const 1))))
(func $declare_variable
  (call $add_local ;; todo: check if name already declared at $scope_depth
    (call $as_obj
      (call $copy_string
        (global.get $prev_start)
        (global.get $prev_len)))))
(func $parse_variable
  (result i32)
  (call $consume
    (global.get $TOKEN_IDENTIFIER))
  (if
    (i32.gt_u
      (global.get $scope_depth)
      (i32.const 0))
    (then
      (call $declare_variable)
      (return
        (i32.const 0))))
  (call $identifier_constant))
(func $define_variable
  (param $global i32)
  (if
    (i32.eqz
      (global.get $scope_depth))
    (then
      (call $write_chunk
        (global.get $OP_DEFINE_GLOBAL))
      (call $write_chunk
        (local.get $global)))))
(func $expression
  (call $parse_precedence
    (global.get $PREC_ASSIGNMENT)))
(func $block
  (block $out
    (loop $block_not_eof
      (if
        (i32.or
          (call $check
            (global.get $TOKEN_RIGHT_BRACE))
          (call $check
            (global.get $TOKEN_EOF)))
        (then
          (br $out)))
      (call $declaration)
      (br $block_not_eof)))
  (call $consume
    (global.get $TOKEN_RIGHT_BRACE)))
(func $var_declaration
  (local $global i32)
  (local.set $global
    (call $parse_variable))
  (if
    (call $match_token
      (global.get $TOKEN_EQUAL))
    (then
      (call $expression))
    (else
      (call $write_chunk
        (global.get $OP_NIL))))
  (call $consume
    (global.get $TOKEN_SEMICOLON))
  (call $define_variable
    (local.get $global)))
(func $expression_statement
  (call $expression)
  (call $consume
    (global.get $TOKEN_SEMICOLON))
  (call $write_chunk
    (global.get $OP_POP)))
(func $emit_jump
  (param $instruction i32)
  (result i32)
  (call $write_chunk
    (local.get $instruction))
  (call $write_chunk
    (i32.const 0xff))
  (call $write_chunk
    (i32.const 0xff))
  (i32.sub
    (i32.load
      (global.get $chunk)) ;; count
    (i32.const 2)))
(func $patch_jump
  (param $offset i32)
  (local $jump i32)
  (local.set $jump
    (i32.sub
      (i32.sub
        (i32.load
          (global.get $chunk)) ;; count
        (local.get $offset))
      (i32.const 2)))
  (call $patch_chunk
    (local.get $offset)
    (i32.and
      (local.get $jump)
      (i32.const 0xff)))
  (call $patch_chunk
    (i32.add
      (local.get $offset)
      (i32.const 1))
    (i32.and
      (i32.shr_u
        (local.get $jump)
        (i32.const 8))
      (i32.const 0xff))))
(func $if_statement
  (local $then_jump i32)
  (local $else_jump i32)
  (call $consume
    (global.get $TOKEN_LEFT_PAREN))
  (call $expression)
  (call $consume
    (global.get $TOKEN_RIGHT_PAREN))
  (local.set $then_jump
    (call $emit_jump
      (global.get $OP_JUMP_IF_FALSE)))
  (call $write_chunk
    (global.get $OP_POP))
  (call $statement)
  (local.set $else_jump
    (call $emit_jump
      (global.get $OP_JUMP)))
  (call $patch_jump
    (local.get $then_jump))
  (call $write_chunk
    (global.get $OP_POP))
  (if
    (call $match_token
      (global.get $TOKEN_ELSE))
    (then
      (call $statement)))
  (call $patch_jump
    (local.get $else_jump)))
(func $print_statement
  (call $expression)
  (call $consume
    (global.get $TOKEN_SEMICOLON))
  (call $write_chunk
    (global.get $OP_PRINT)))
(func $declaration
  (if
    (call $match_token
      (global.get $TOKEN_VAR))
    (then
      (call $var_declaration))
    (else
      (call $statement))))
(func $statement
  (if
    (call $match_token
      (global.get $TOKEN_PRINT))
    (then
      (call $print_statement))
    (else
      (if
        (call $match_token
          (global.get $TOKEN_IF))
        (then
          (call $if_statement))
        (else
          (if
            (call $match_token
              (global.get $TOKEN_LEFT_BRACE))
            (then
              (call $begin_scope)
              (call $block)
              (call $end_scope))
            (else
              (call $expression_statement))))))))
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
(func $variable
  (local $arg i32)
  (local $get_op i32)
  (local $set_op i32)
  (local.set $arg
    (call $resolve_local
      (call $as_obj
        (call $copy_string
          (global.get $prev_start)
          (global.get $prev_len)))))
  (if
    (i32.ne
      (local.get $arg)
      (i32.const -1))
    (then
      (local.set $get_op
        (global.get $OP_GET_LOCAL))
      (local.set $set_op
        (global.get $OP_SET_LOCAL)))
    (else
      (local.set $arg
        (call $identifier_constant))
      (local.set $get_op
        (global.get $OP_GET_GLOBAL))
      (local.set $set_op
        (global.get $OP_SET_GLOBAL))))
  (if
    (call $match_token
      (global.get $TOKEN_EQUAL)) ;; todo: check precedence <= PREC_ASSIGNMENT
    (then
      (call $expression)
      (call $write_chunk
        (local.get $set_op)))
    (else
      (call $write_chunk
        (local.get $get_op))))
  (call $write_chunk
    (local.get $arg)))
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
${indent(
  watSwitch(
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
    },
  ),
  2,
)}
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
${indent(
  watSwitch(
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
    },
  ),
  2,
)}
  )
(func $literal
  (local $literal i32)
  (local.set $literal
    (global.get $previous))
${indent(
  watSwitch(
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
    },
  ),
  2,
)}
  )
(func $begin_scope
  (global.set $scope_depth
    (i32.add
      (global.get $scope_depth)
      (i32.const 1))))
(func $end_scope
  (global.set $scope_depth
    (i32.sub
      (global.get $scope_depth)
      (i32.const 1)))
  (block $out
    (loop $pop_local
      (br_if $out
        (i32.or
          (i32.eqz
            (global.get $local_count))
          (i32.eq
            (i32.load
              (i32.add
                (i32.add
                  (global.get $locals)
                  (i32.mul
                    (global.get $local_count)
                    (i32.const 8)))
                (i32.const 4))) ;; depth
            (global.get $scope_depth))))
      (call $write_chunk
        (global.get $OP_POP))
      (global.set $local_count
        (i32.sub
          (global.get $local_count)
          (i32.const 1)))
      (br $pop_local))))
(func $compile
  (param $srcptr i32)
  (call $init_scanner
    (local.get $srcptr))
  (global.set $locals
    (call $alloc
      (i32.const 512)))
  (call $advance)
  (block $out
    (loop $not_eof
      (if
        (call $match_token
          (global.get $TOKEN_EOF))
        (then
          (br $out)))
      (call $declaration)
      (br $not_eof)))
  (call $write_chunk
    (global.get $OP_RETURN))
  )
`;
