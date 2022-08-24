import { OP_CODES } from './chunk';
import { indent, watSwitch } from './common';
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
(; typedef struct {
  i32 *name;
  i32 depth;
  i32 is_captured;
} Local
typedef struct {
  i32 is_local;
  i32 index;
} Upvalue
typedef struct {
  i32 *enclosing;
  i32 *function;
  i32 *locals;
  i32 local_count;
  i32 *upvalues;
  i32 scope_depth;
} Compiler ;)
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
(global $compiler
  (mut i32)
  (i32.const 0))
(func $init_compiler
  (local $compiler i32)
  (local.set $compiler
    (call $alloc
      (i32.const 6)))
  (i32.store
    (local.get $compiler) ;; *enclosing
    (global.get $compiler))
  (i32.store
    (i32.add
      (local.get $compiler)
      (i32.const 4)) ;; *function
    (call $as_obj
      (call $new_function)))
  (i32.store
    (i32.add
      (local.get $compiler)
      (i32.const 8)) ;; *locals
    (call $alloc
      (i32.const 768)))
  (i32.store
    (i32.add
      (local.get $compiler)
      (i32.const 16)) ;; *upvalues
    (call $alloc
      (i32.const 512)))
  (global.set $compiler
    (local.get $compiler))
  (call $add_local
    (call $as_obj
      (call $new_string
        (call $alloc
          (i32.const 0)))))) ;; ""
(func $get_enclosing
  (param $compiler i32)
  (result i32)
  (i32.load
    (local.get $compiler))) ;; *enclosing
(func $get_function
  (param $compiler i32)
  (result f64)
  (call $obj_val
    (i32.load
      (i32.add
        (local.get $compiler)
        (i32.const 4))))) ;; *function
(func $get_locals
  (param $compiler i32)
  (result i32)
  (i32.load
    (i32.add
      (local.get $compiler)
      (i32.const 8)))) ;; *locals
(func $get_local_count
  (param $compiler i32)
  (result i32)
  (i32.load
    (i32.add
      (local.get $compiler)
      (i32.const 12)))) ;; local_count
(func $set_local_count
  (param $compiler i32)
  (param $count i32)
  (i32.store
    (i32.add
      (local.get $compiler)
      (i32.const 12)) ;; local_count
    (local.get $count)))
(func $get_upvalues
  (param $compiler i32)
  (result i32)
  (i32.load
    (i32.add
      (local.get $compiler)
      (i32.const 16)))) ;; *upvalues
(func $get_scope_depth
  (result i32)
  (i32.load
    (i32.add
      (global.get $compiler)
      (i32.const 20)))) ;; scope_depth
(func $set_scope_depth
  (param $depth i32)
  (i32.store
    (i32.add
      (global.get $compiler)
      (i32.const 20)) ;; scope_depth
    (local.get $depth)))
(func $get_is_captured
  (param $compiler i32)
  (param $i i32)
  (result i32)
  (i32.load
    (i32.add
      (i32.add
        (call $get_locals
          (local.get $compiler))
        (i32.mul
          (local.get $i)
          (i32.const 12))) ;; sizeof Local
      (i32.const 4)))) ;; is_captured
(func $set_is_captured
  (param $compiler i32)
  (param $i i32)
  (param $is_captured i32)
  (i32.store
    (i32.add
      (i32.add
        (call $get_locals
          (local.get $compiler))
        (i32.mul
          (local.get $i)
          (i32.const 12))) ;; sizeof Local
      (i32.const 4)) ;; is_captured
    (local.get $is_captured)))
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
    (result i32)
    (i32.eqz
      (call $check
        (local.get $token)))
    (then
      (i32.const 0))
    (else
      (call $advance)
      (i32.const 1))))
(func $emit_byte
  (param $b i32)
  (call $write_chunk
    (call $get_chunk
      (call $get_function
        (global.get $compiler)))
    (local.get $b)))
(func $emit_bytes
  (param $a i32)
  (param $b i32)
  (local $chunk i32)
  (local.set $chunk
    (call $get_chunk
      (call $get_function
        (global.get $compiler))))
  (call $write_chunk
    (local.get $chunk)
    (local.get $a))
  (call $write_chunk
    (local.get $chunk)
    (local.get $b)))
(func $get_precedence
  (param $operator i32)
  (result i32)
  (local $result i32)
${indent(
  watSwitch(
    `;;wasm
    (local.get $operator)`,
    [
      [
        TOKENS.TOKEN_LEFT_PAREN,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_CALL}))
        (br $break)`,
      ],
      [TOKENS.TOKEN_PLUS, ''],
      [
        TOKENS.TOKEN_MINUS,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_TERM}))
        (br $break)`,
      ],
      [TOKENS.TOKEN_STAR, ''],
      [
        TOKENS.TOKEN_SLASH,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_FACTOR}))
        (br $break)`,
      ],
      [TOKENS.TOKEN_BANG_EQUAL, ''],
      [
        TOKENS.TOKEN_EQUAL_EQUAL,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_EQUALITY}))
        (br $break)`,
      ],
      [TOKENS.TOKEN_GREATER, ''],
      [TOKENS.TOKEN_GREATER_EQUAL, ''],
      [TOKENS.TOKEN_LESS, ''],
      [
        TOKENS.TOKEN_LESS_EQUAL,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_COMPARISON}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_AND,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_AND}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_OR,
        `;;wasm
        (local.set $result
          (i32.const ${PRECEDENCE.PREC_OR}))
        (br $break)`,
      ],
    ],
    `;;wasm
    (local.set $result
      (i32.const ${PRECEDENCE.PREC_NONE}))`,
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
    [
      [
        TOKENS.TOKEN_LEFT_PAREN,
        `;;wasm
        (call $grouping)
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_NUMBER,
        `;;wasm
        (call $number)
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_STRING,
        `;;wasm
        (call $string)
        (br $break)`,
      ],
      [TOKENS.TOKEN_MINUS, ''],
      [
        TOKENS.TOKEN_BANG,
        `;;wasm
        (call $unary)
        (br $break)`,
      ],
      [TOKENS.TOKEN_FALSE, ''],
      [TOKENS.TOKEN_TRUE, ''],
      [
        TOKENS.TOKEN_NIL,
        `;;wasm
        (call $literal)
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_IDENTIFIER,
        `;;wasm
        (call $variable)
        (br $break)`,
      ],
    ],
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
    [
      [
        TOKENS.TOKEN_LEFT_PAREN,
        `;;wasm
        (call $call)
        (br $break)`,
      ],
      [TOKENS.TOKEN_PLUS, ''],
      [TOKENS.TOKEN_MINUS, ''],
      [TOKENS.TOKEN_STAR, ''],
      [TOKENS.TOKEN_SLASH, ''],
      [TOKENS.TOKEN_BANG_EQUAL, ''],
      [TOKENS.TOKEN_EQUAL_EQUAL, ''],
      [TOKENS.TOKEN_GREATER, ''],
      [TOKENS.TOKEN_GREATER_EQUAL, ''],
      [TOKENS.TOKEN_LESS, ''],
      [
        TOKENS.TOKEN_LESS_EQUAL,
        `;;wasm
        (call $binary)
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_AND,
        `;;wasm
        (call $and)
        (br $break)
        `,
      ],
      [
        TOKENS.TOKEN_OR,
        `;;wasm
        (call $or)
        (br $break)
        `,
      ],
    ],
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
  (param $compiler i32)
  (param $nameptr i32)
  (result i32)
  (local $i i32)
  (local $localptr i32)
  (local.set $i
    (i32.sub
      (call $get_local_count
        (local.get $compiler))
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
              (call $get_locals
                (local.get $compiler))
              (i32.mul
                (local.get $i)
                (i32.const 12))))) ;; sizeof Local
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
(func $add_upvalue
  (param $compiler i32)
  (param $index i32)
  (param $is_local i32)
  (result i32)
  (local $function f64)
  (local $upvalue_count i32)
  (local $upvalues i32)
  (local $i i32)
  (local $upvalueptr i32)
  (local.set $function
    (call $get_function
      (local.get $compiler)))
  (local.set $upvalue_count
    (call $get_upvalue_count ;; should check this is < 256
      (local.get $function)))
  (local.set $upvalues
    (call $get_upvalues
      (local.get $compiler)))
  (local.set $i
    (i32.const 0))
  (block $out
    (loop $loop
      (br_if $out
        (i32.ge_u
          (local.get $i)
          (local.get $upvalue_count)))
      (local.set $upvalueptr
        (i32.add
          (local.get $upvalues)
          (i32.mul
            (local.get $i)
            (i32.const 8)))) ;; sizeof Upvalue
      (if
        (i32.and
          (i32.eq
            (i32.load
              (local.get $upvalueptr)) ;; is_local
            (local.get $is_local))
          (i32.eq
            (i32.load
              (i32.add
                (local.get $upvalueptr)
                (i32.const 4))) ;; index
            (local.get $index)))
        (then
          (return
            (local.get $i))))
      (local.set $i
        (i32.add
          (local.get $i)
          (i32.const 1)))
      (br $loop)))
  (local.set $upvalueptr
    (i32.add
      (local.get $upvalues)
      (i32.mul
        (local.get $upvalue_count)
        (i32.const 8)))) ;; sizeof Upvalue
  (i32.store
    (local.get $upvalueptr) ;; is_local
    (local.get $is_local))
  (i32.store
    (i32.add
      (local.get $upvalueptr)
      (i32.const 4)) ;; index
    (local.get $index))
  (call $set_upvalue_count
    (local.get $function)
    (i32.add
      (local.get $upvalue_count)
      (i32.const 1)))
  (local.get $upvalue_count))
(func $resolve_upvalue
  (param $compiler i32)
  (param $nameptr i32)
  (result i32)
  (local $enclosing i32)
  (local $local i32)
  (local $upvalue i32)
  (local.set $enclosing
    (call $get_enclosing
      (local.get $compiler)))
  (if
    (i32.eqz
      (local.get $enclosing))
    (then
      (return
        (i32.const -1))))
  (local.set $local
    (call $resolve_local
      (local.get $enclosing)
      (local.get $nameptr)))
  (if
    (i32.ne
      (local.get $local)
      (i32.const -1))
    (then
      (call $set_is_captured
        (local.get $enclosing)
        (local.get $local)
        (i32.const 1))
      (return
        (call $add_upvalue
          (local.get $compiler)
          (local.get $local)
          (i32.const 1)))))
  (local.set $upvalue
    (call $resolve_upvalue
      (local.get $enclosing)
      (local.get $nameptr)))
  (if
    (i32.ne
      (local.get $upvalue)
      (i32.const -1))
    (then
      (return
        (call $add_upvalue
          (local.get $compiler)
          (local.get $upvalue)
          (i32.const 0)))))
  (i32.const -1))
(func $add_local
  (param $nameptr i32)
  (local $localptr i32)
  (local.set $localptr
    (i32.add
      (call $get_locals
        (global.get $compiler))
      (i32.mul
        (call $get_local_count ;; should check this is < 256
          (global.get $compiler))
        (i32.const 12)))) ;; sizeof Local
  (i32.store
    (local.get $localptr)
    (local.get $nameptr))
  (i32.store
    (i32.add
      (local.get $localptr)
      (i32.const 4)) ;; depth
    (call $get_scope_depth))
  (call $set_local_count
    (global.get $compiler)
    (i32.add
      (call $get_local_count
        (global.get $compiler))
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
    (i32.const ${TOKENS.TOKEN_IDENTIFIER}))
  (if
    (result i32)
    (i32.gt_u
      (call $get_scope_depth)
      (i32.const 0))
    (then
      (call $declare_variable)
      (i32.const 0))
    (else
      (call $identifier_constant))))
(func $define_variable
  (param $global i32)
  (if
    (i32.eqz
      (call $get_scope_depth))
    (then
      (call $emit_bytes
        (i32.const ${OP_CODES.OP_DEFINE_GLOBAL})
        (local.get $global)))))
(func $arguments_list
  (result i32)
  (local $arg_count i32)
  (local.set $arg_count
    (i32.const 0))
  (if
    (i32.eqz
      (call $check
        (i32.const ${TOKENS.TOKEN_RIGHT_PAREN})))
    (then
      (loop $arguments
        (call $expression)
        (local.set $arg_count
          (i32.add
            (local.get $arg_count)
            (i32.const 1)))
        (br_if $arguments
          (call $match_token
            (i32.const ${TOKENS.TOKEN_COMMA}))))))
  (call $consume
    (i32.const ${TOKENS.TOKEN_RIGHT_PAREN}))
  (local.get $arg_count))
(func $and
  (local $end_jump i32)
  (local.set $end_jump
    (call $emit_jump
      (i32.const ${OP_CODES.OP_JUMP_IF_FALSE})))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP}))
  (call $parse_precedence
    (i32.const ${PRECEDENCE.PREC_AND}))
  (call $patch_jump
    (local.get $end_jump)))
(func $or
  (local $else_jump i32)
  (local $end_jump i32)
  (local.set $else_jump
    (call $emit_jump
      (i32.const ${OP_CODES.OP_JUMP_IF_FALSE})))
  (local.set $end_jump
    (call $emit_jump
      (i32.const ${OP_CODES.OP_JUMP})))
  (call $patch_jump
    (local.get $else_jump))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP}))
  (call $parse_precedence
    (i32.const ${PRECEDENCE.PREC_OR}))
  (call $patch_jump
    (local.get $end_jump)))
(func $expression
  (call $parse_precedence
    (i32.const ${PRECEDENCE.PREC_ASSIGNMENT})))
(func $block
  (block $out
    (loop $block_not_eof
      (if
        (i32.or
          (call $check
            (i32.const ${TOKENS.TOKEN_RIGHT_BRACE}))
          (call $check
            (i32.const ${TOKENS.TOKEN_EOF})))
        (then
          (br $out)))
      (call $declaration)
      (br $block_not_eof)))
  (call $consume
    (i32.const ${TOKENS.TOKEN_RIGHT_BRACE})))
(func $function
  (local $function f64)
  (local $upvalue_count i32)
  (local $upvalues i32)
  (local $i i32)
  (local $upvalueptr i32)
  (call $init_compiler)
  (local.set $function
    (call $get_function
      (global.get $compiler)))
  (call $set_name
    (local.get $function)
    (call $as_obj
      (call $copy_string
        (global.get $prev_start)
        (global.get $prev_len))))
  (call $begin_scope)
  (call $consume
    (i32.const ${TOKENS.TOKEN_LEFT_PAREN}))
  (if
    (i32.eqz
      (call $check
        (i32.const ${TOKENS.TOKEN_RIGHT_PAREN})))
    (then
      (loop $parameters
        (call $set_arity
          (local.get $function)
          (i32.add
            (call $get_arity
              (local.get $function))
            (i32.const 1))) ;; todo: check arity <= 255
        (call $define_variable
          (call $parse_variable))
        (br_if $parameters
          (call $match_token
            (i32.const ${TOKENS.TOKEN_COMMA}))))))
  (call $consume
    (i32.const ${TOKENS.TOKEN_RIGHT_PAREN}))
  (call $consume
    (i32.const ${TOKENS.TOKEN_LEFT_BRACE}))
  (call $block)
  (local.set $upvalues
    (call $get_upvalues
      (global.get $compiler)))
  (local.set $function
    (call $end_compiler))
  (call $emit_bytes
    (i32.const ${OP_CODES.OP_CLOSURE})
    (call $write_value_array
      (local.get $function)))
  (local.set $upvalue_count
    (call $get_upvalue_count
      (local.get $function)))
  (local.set $i
    (i32.const 0))
  (block $out
    (loop $loop
      (br_if $out
        (i32.ge_u
          (local.get $i)
          (local.get $upvalue_count)))
      (local.set $upvalueptr
        (i32.add
          (local.get $upvalues)
          (i32.mul
            (local.get $i)
            (i32.const 8)))) ;; sizeof Upvalue
      (call $emit_bytes
        (i32.load
          (local.get $upvalueptr)) ;; is_local
        (i32.load
          (i32.add
            (local.get $upvalueptr)
            (i32.const 4)))) ;; index
      (local.set $i
        (i32.add
          (local.get $i)
          (i32.const 1)))
      (br $loop))))
(func $fun_declaration
  (local $global i32)
  (local.set $global
    (call $parse_variable))
  (call $function)
  (call $define_variable
    (local.get $global)))
(func $var_declaration
  (local $global i32)
  (local.set $global
    (call $parse_variable))
  (if
    (call $match_token
      (i32.const ${TOKENS.TOKEN_EQUAL}))
    (then
      (call $expression))
    (else
      (call $emit_byte
        (i32.const ${OP_CODES.OP_NIL}))))
  (call $consume
    (i32.const ${TOKENS.TOKEN_SEMICOLON}))
  (call $define_variable
    (local.get $global)))
(func $expression_statement
  (call $expression)
  (call $consume
    (i32.const ${TOKENS.TOKEN_SEMICOLON}))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP})))
(func $emit_jump
  (param $instruction i32)
  (result i32)
  (call $emit_byte
    (local.get $instruction))
  (call $emit_bytes
    (i32.const 0xff)
    (i32.const 0xff))
  (i32.sub
    (i32.load
      (call $get_chunk ;; count
        (call $get_function
          (global.get $compiler))))
    (i32.const 2)))
(func $patch_jump
  (param $offset i32)
  (local $jump i32)
  (local.set $jump
    (i32.sub
      (i32.sub
        (i32.load
          (call $get_chunk ;; count
            (call $get_function
              (global.get $compiler))))
        (local.get $offset))
      (i32.const 2)))
  (call $patch_chunk
    (call $get_chunk
      (call $get_function
        (global.get $compiler)))
    (local.get $offset)
    (i32.and
      (local.get $jump)
      (i32.const 0xff)))
  (call $patch_chunk
    (call $get_chunk
      (call $get_function
        (global.get $compiler)))
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
    (i32.const ${TOKENS.TOKEN_LEFT_PAREN}))
  (call $expression)
  (call $consume
    (i32.const ${TOKENS.TOKEN_RIGHT_PAREN}))
  (local.set $then_jump
    (call $emit_jump
      (i32.const ${OP_CODES.OP_JUMP_IF_FALSE})))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP}))
  (call $statement)
  (local.set $else_jump
    (call $emit_jump
      (i32.const ${OP_CODES.OP_JUMP})))
  (call $patch_jump
    (local.get $then_jump))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP}))
  (if
    (call $match_token
      (i32.const ${TOKENS.TOKEN_ELSE}))
    (then
      (call $statement)))
  (call $patch_jump
    (local.get $else_jump)))
(func $emit_loop
  (param $loop_start i32)
  (local $jump i32)
  (call $emit_byte
    (i32.const ${OP_CODES.OP_LOOP}))
  (local.set $jump
    (i32.add
      (i32.sub
        (i32.load
          (call $get_chunk ;; count
            (call $get_function
              (global.get $compiler))))
        (local.get $loop_start))
      (i32.const 2)))
  (call $emit_byte
    (i32.and
      (local.get $jump)
      (i32.const 0xff)))
  (call $emit_byte
    (i32.and
      (i32.shr_u
        (local.get $jump)
        (i32.const 8))
      (i32.const 0xff))))
(func $while_statement
  (local $loop_start i32)
  (local $exit_jump i32)
  (local.set $loop_start
    (i32.load
      (call $get_chunk ;; count
        (call $get_function
          (global.get $compiler)))))
  (call $consume
    (i32.const ${TOKENS.TOKEN_LEFT_PAREN}))
  (call $expression)
  (call $consume
    (i32.const ${TOKENS.TOKEN_RIGHT_PAREN}))
  (local.set $exit_jump
    (call $emit_jump
      (i32.const ${OP_CODES.OP_JUMP_IF_FALSE})))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP}))
  (call $statement)
  (call $emit_loop
    (local.get $loop_start))
  (call $patch_jump
    (local.get $exit_jump))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_POP})))
(func $for_statement
  (local $loop_start i32)
  (local $exit_jump i32)
  (local $body_jump i32)
  (local $increment_start i32)
  (call $begin_scope)
  (call $consume
    (i32.const ${TOKENS.TOKEN_LEFT_PAREN}))
  (if
    (i32.eqz
      (call $match_token
        (i32.const ${TOKENS.TOKEN_SEMICOLON})))
    (then
      (if
        (call $match_token
          (i32.const ${TOKENS.TOKEN_VAR}))
        (then
          (call $var_declaration))
        (else
          (call $expression_statement)))))
  (local.set $loop_start
    (i32.load
      (call $get_chunk ;; count
        (call $get_function
          (global.get $compiler)))))
  (local.set $exit_jump
    (i32.const -1))
  (if
    (i32.eqz
      (call $match_token
        (i32.const ${TOKENS.TOKEN_SEMICOLON})))
    (then
      (call $expression)
      (call $consume
        (i32.const ${TOKENS.TOKEN_SEMICOLON}))
      (local.set $exit_jump
        (call $emit_jump
          (i32.const ${OP_CODES.OP_JUMP_IF_FALSE})))
      (call $emit_byte
        (i32.const ${OP_CODES.OP_POP}))))
  (if
    (i32.eqz
      (call $match_token
        (i32.const ${TOKENS.TOKEN_RIGHT_PAREN})))
    (then
      (local.set $body_jump
        (call $emit_jump
          (i32.const ${OP_CODES.OP_JUMP})))
      (local.set $increment_start
        (i32.load
          (call $get_chunk ;; count
            (call $get_function
              (global.get $compiler)))))
      (call $expression)
      (call $emit_byte
        (i32.const ${OP_CODES.OP_POP}))
      (call $consume
        (i32.const ${TOKENS.TOKEN_RIGHT_PAREN}))
      (call $emit_loop
        (local.get $loop_start))
      (local.set $loop_start
        (local.get $increment_start))
      (call $patch_jump
        (local.get $body_jump))))
  (call $statement)
  (call $emit_loop
    (local.get $loop_start))
  (if
    (i32.ne
      (local.get $exit_jump)
      (i32.const -1))
    (then
      (call $patch_jump
        (local.get $exit_jump))
      (call $emit_byte
        (i32.const ${OP_CODES.OP_POP}))))
  (call $end_scope))
(func $print_statement
  (call $expression)
  (call $consume
    (i32.const ${TOKENS.TOKEN_SEMICOLON}))
  (call $emit_byte
    (i32.const ${OP_CODES.OP_PRINT})))
(func $return_statement
  (if
    (call $match_token
      (i32.const ${TOKENS.TOKEN_SEMICOLON}))
    (then
      (call $emit_return))
    (else
      (call $expression)
      (call $consume
        (i32.const ${TOKENS.TOKEN_SEMICOLON}))
      (call $emit_byte
        (i32.const ${OP_CODES.OP_RETURN})))))
(func $declaration
  (if
    (call $match_token
      (i32.const ${TOKENS.TOKEN_FUN}))
    (then
      (call $fun_declaration))
    (else
      (if
        (call $match_token
          (i32.const ${TOKENS.TOKEN_VAR}))
        (then
          (call $var_declaration))
        (else
          (call $statement))))))
(func $statement
  (if
    (call $match_token
      (i32.const ${TOKENS.TOKEN_PRINT}))
    (then
      (call $print_statement))
    (else
      (if
        (call $match_token
          (i32.const ${TOKENS.TOKEN_FOR}))
        (then
          (call $for_statement))
        (else
          (if
            (call $match_token
              (i32.const ${TOKENS.TOKEN_IF}))
            (then
              (call $if_statement))
            (else
              (if
                (call $match_token
                  (i32.const ${TOKENS.TOKEN_RETURN}))
                (then
                  (call $return_statement))
                (else
                  (if
                    (call $match_token
                      (i32.const ${TOKENS.TOKEN_WHILE}))
                    (then
                      (call $while_statement))
                    (else
                      (if
                        (call $match_token
                          (i32.const ${TOKENS.TOKEN_LEFT_BRACE}))
                        (then
                          (call $begin_scope)
                          (call $block)
                          (call $end_scope))
                        (else
                          (call $expression_statement))))))))))))))
(func $number
  (call $emit_bytes
    (i32.const ${OP_CODES.OP_CONSTANT})
    (call $write_value_array
      (call $stringToDouble
        (global.get $prev_start)
        (global.get $prev_len)))))
(func $string
  (call $emit_bytes
    (i32.const ${OP_CODES.OP_CONSTANT})
    (call $write_value_array
      (call $copy_string
        (i32.add
          (global.get $prev_start)
          (i32.const 4))
        (i32.sub
          (global.get $prev_len)
          (i32.const 2))))))
(func $variable
  (local $nameptr i32)
  (local $arg i32)
  (local $get_op i32)
  (local $set_op i32)
  (local.set $nameptr
    (call $as_obj
      (call $copy_string
        (global.get $prev_start)
        (global.get $prev_len))))
  (local.set $arg
    (call $resolve_local
      (global.get $compiler)
      (local.get $nameptr)))
  (if
    (i32.ne
      (local.get $arg)
      (i32.const -1))
    (then
      (local.set $get_op
        (i32.const ${OP_CODES.OP_GET_LOCAL}))
      (local.set $set_op
        (i32.const ${OP_CODES.OP_SET_LOCAL})))
    (else
      (local.set $arg
        (call $resolve_upvalue
          (global.get $compiler)
          (local.get $nameptr)))
      (if
        (i32.ne
          (local.get $arg)
          (i32.const -1))
        (then
          (local.set $get_op
            (i32.const ${OP_CODES.OP_GET_UPVALUE}))
          (local.set $set_op
            (i32.const ${OP_CODES.OP_SET_UPVALUE})))
        (else
          (local.set $arg
            (call $identifier_constant))
          (local.set $get_op
            (i32.const ${OP_CODES.OP_GET_GLOBAL}))
          (local.set $set_op
            (i32.const ${OP_CODES.OP_SET_GLOBAL}))))))
  (if
    (call $match_token
      (i32.const ${TOKENS.TOKEN_EQUAL})) ;; todo: check precedence <= PREC_ASSIGNMENT
    (then
      (call $expression)
      (call $emit_byte
        (local.get $set_op)))
    (else
      (call $emit_byte
        (local.get $get_op))))
  (call $emit_byte
    (local.get $arg)))
(func $grouping
  (call $expression)
  (call $consume
    (i32.const ${TOKENS.TOKEN_RIGHT_PAREN})))
(func $unary
  (local $operator i32)
  (local.set $operator
    (global.get $previous))
  (call $parse_precedence
    (i32.const ${PRECEDENCE.PREC_UNARY}))
${indent(
  watSwitch(
    `;;wasm
    (local.get $operator)`,
    [
      [
        TOKENS.TOKEN_MINUS,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_NEGATE}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_BANG,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_NOT}))
        (br $break)`,
      ],
    ],
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
    [
      [
        TOKENS.TOKEN_PLUS,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_ADD}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_MINUS,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_SUBTRACT}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_STAR,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_MULTIPLY}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_SLASH,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_DIVIDE}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_BANG_EQUAL,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_NOT_EQUAL}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_EQUAL_EQUAL,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_EQUAL}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_GREATER,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_GREATER}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_GREATER_EQUAL,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_NOT_LESS}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_LESS,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_LESS}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_LESS_EQUAL,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_NOT_GREATER}))
        (br $break)`,
      ],
    ],
  ),
  2,
)}
  )
(func $call
  (call $emit_bytes
    (i32.const ${OP_CODES.OP_CALL})
    (call $arguments_list)))
(func $literal
  (local $literal i32)
  (local.set $literal
    (global.get $previous))
${indent(
  watSwitch(
    `;;wasm
    (local.get $literal)`,
    [
      [
        TOKENS.TOKEN_FALSE,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_FALSE}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_TRUE,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_TRUE}))
        (br $break)`,
      ],
      [
        TOKENS.TOKEN_NIL,
        `;;wasm
        (call $emit_byte
          (i32.const ${OP_CODES.OP_NIL}))
        (br $break)`,
      ],
    ],
  ),
  2,
)}
  )
(func $begin_scope
  (call $set_scope_depth
    (i32.add
      (call $get_scope_depth)
      (i32.const 1))))
(func $end_scope
  (local $local_count i32)
  (call $set_scope_depth
    (i32.sub
      (call $get_scope_depth)
      (i32.const 1)))
  (block $out
    (loop $pop_local
      (local.set $local_count
        (call $get_local_count
          (global.get $compiler)))
      (br_if $out
        (i32.or
          (i32.eqz
            (local.get $local_count))
          (i32.eq
            (i32.load
              (i32.add
                (i32.add
                  (call $get_locals
                    (global.get $compiler))
                  (i32.mul
                    (local.get $local_count)
                    (i32.const 12))) ;; sizeof Local
                (i32.const 4))) ;; depth
            (call $get_scope_depth))))
      (local.set $local_count
        (i32.sub
          (local.get $local_count)
          (i32.const 1)))
      (if
        (call $get_is_captured
          (global.get $compiler)
          (local.get $local_count))
        (then
          (call $emit_byte
            (i32.const ${OP_CODES.OP_CLOSE_UPVALUE})))
        (else
          (call $emit_byte
            (i32.const ${OP_CODES.OP_POP}))))
      (call $set_local_count
        (global.get $compiler)
        (local.get $local_count))
      (br $pop_local))))
(func $emit_return
  (call $emit_bytes
    (i32.const ${OP_CODES.OP_NIL})
    (i32.const ${OP_CODES.OP_RETURN})))
(func $end_compiler
  (result f64)
  (local $function f64)
  (local.set $function
    (call $get_function
      (global.get $compiler)))
  (call $emit_return)
  (global.set $compiler
    (call $get_enclosing
      (global.get $compiler)))
  (local.get $function))
(func $compile
  (param $srcptr i32)
  (result f64)
  (call $init_scanner
    (local.get $srcptr))
  (call $init_compiler)
  (call $advance)
  (block $out
    (loop $not_eof
      (if
        (call $match_token
          (i32.const ${TOKENS.TOKEN_EOF}))
        (then
          (br $out)))
      (call $declaration)
      (br $not_eof)))
  (call $end_compiler))
`;
