import { charToHex, enumToGlobals } from './common';

export enum TOKENS {
  // Single-character tokens.
  TOKEN_LEFT_PAREN = 1, TOKEN_RIGHT_PAREN,
  TOKEN_LEFT_BRACE, TOKEN_RIGHT_BRACE,
  TOKEN_COMMA, TOKEN_DOT, TOKEN_MINUS, TOKEN_PLUS,
  TOKEN_SEMICOLON, TOKEN_SLASH, TOKEN_STAR,
  // One or two character tokens.
  TOKEN_BANG, TOKEN_BANG_EQUAL,
  TOKEN_EQUAL, TOKEN_EQUAL_EQUAL,
  TOKEN_GREATER, TOKEN_GREATER_EQUAL,
  TOKEN_LESS, TOKEN_LESS_EQUAL,
  // Literals.
  TOKEN_IDENTIFIER, TOKEN_STRING, TOKEN_NUMBER,
  // Keywords.
  TOKEN_AND, TOKEN_CLASS, TOKEN_ELSE, TOKEN_FALSE,
  TOKEN_FOR, TOKEN_FUN, TOKEN_IF, TOKEN_NIL, TOKEN_OR,
  TOKEN_PRINT, TOKEN_RETURN, TOKEN_SUPER, TOKEN_THIS,
  TOKEN_TRUE, TOKEN_VAR, TOKEN_WHILE,

  TOKEN_ERROR, TOKEN_EOF
}

export default `;;wasm
${enumToGlobals(TOKENS)}
(; typedef struct {
  i8 *end;
  i8 *current;
  i32 line;
} Scanner ;)
(global $scanner
  (mut i32)
  (i32.const 0))
(func $init_scanner
  (param $srcptr i32)
  (local $this i32)
  (local.set $this
    (call $alloc
      (i32.const 4)))
  (i32.store
    (local.get $this) ;; *end
    (i32.add
      (local.get $srcptr)
      (call $get_len
        (local.get $srcptr))))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 4)) ;; *current
    (local.get $srcptr))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 8)) ;; line
    (i32.const 1))
  (global.set $scanner
    (local.get $this)))
(func $match
  (param $end i32)
  (param $current i32)
  (param $expected i32)
  (result i32)
  (if
    (i32.eq
      (local.get $current)
      (local.get $end))
    (then
      (return
        (i32.const 0))))
  (i32.eq
    (i32.load8_u
      (i32.add
        (local.get $current)
        (i32.const 1)))
    (local.get $expected)))
(func $is_digit
  (param $char i32)
  (result i32)
  (i32.and
    (i32.ge_u
      (local.get $char)
      (i32.const ${charToHex('0')}))
    (i32.le_u
      (local.get $char)
      (i32.const ${charToHex('9')}))))
(func $is_alpha
  (param $char i32)
  (result i32)
  (i32.or
    (i32.or
      (i32.and
        (i32.ge_u
          (local.get $char)
          (i32.const ${charToHex('a')}))
        (i32.le_u
          (local.get $char)
          (i32.const ${charToHex('z')})))
      (i32.and
        (i32.ge_u
          (local.get $char)
          (i32.const ${charToHex('A')}))
        (i32.le_u
          (local.get $char)
          (i32.const ${charToHex('Z')}))))
    (i32.eq
      (local.get $char)
      (i32.const ${charToHex('_')}))))
(func $scan_token
  (result i32)
  (local $this i32)
  (local $start i32)
  (local $end i32)
  (local $current i32)
  (local $char i32)
  (local $len i32)
  (local $result i32)
  (local.set $this
    (global.get $scanner))
  (local.set $end
    (i32.load
      (local.get $this))) ;; *end
  (local.set $current
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 4)))) ;; *current
  (block $out
    (if
      (i32.eq
        (local.get $current)
        (local.get $end))
      (then
        (local.set $result
          (global.get $TOKEN_EOF))
        (br $out)))
    (block $end_whitespace
      (loop $skip_whitespace
        (local.set $char
          (i32.load8_u
            (local.get $current)))
        (if
          (i32.or
            (i32.or
              (i32.eq
                  (local.get $char)
                  (i32.const ${charToHex(' ')}))
                (i32.eq
                  (local.get $char)
                  (i32.const ${charToHex('\n')})))
            (i32.or
              (i32.eq
                  (local.get $char)
                  (i32.const ${charToHex('\r')}))
                (i32.eq
                  (local.get $char)
                  (i32.const ${charToHex('\t')}))))
          (then
            (local.set $current
              (i32.add
                (local.get $current)
                (i32.const 1)))
            (br $skip_whitespace)))
          (if
            (i32.eq
              (local.get $char)
                  (i32.const ${charToHex('/')}))
            (then
              (if
                (call $match
                  (local.get $end)
                  (local.get $current)
                  (i32.const ${charToHex('/')}))
                (then
                  (loop $comment
                    (local.set $current
                      (i32.add
                        (local.get $current)
                        (i32.const 1)))
                    (if
                      (i32.eq
                        (local.get $current)
                        (local.get $end))
                      (then
                        (local.set $result
                          (global.get $TOKEN_EOF))
                        (br $out)))
                    (if
                      (call $match
                        (local.get $end)
                        (local.get $current)
                        (i32.const ${charToHex('\n')}))
                      (then
                        (br $skip_whitespace)))
                    (br $comment)))
                (else
                  (br $end_whitespace))
              )
            )
          )
        (br $end_whitespace)))
    (local.set $start
      (local.get $current))
${Object.entries({
  '(': '$TOKEN_LEFT_PAREN',
  ')': '$TOKEN_RIGHT_PAREN',
  '{': '$TOKEN_LEFT_BRACE',
  '}': '$TOKEN_RIGHT_BRACE',
  ';': '$TOKEN_SEMICOLON',
  ',': '$TOKEN_COMMA',
  '.': '$TOKEN_DOT',
  '-': '$TOKEN_MINUS',
  '+': '$TOKEN_PLUS',
  '/': '$TOKEN_SLASH',
  '*': '$TOKEN_STAR',
}).map(([char, token]) => `;;wasm
    (if
      (i32.eq
        (local.get $char)
        (i32.const ${charToHex(char)}))
      (then
        (local.set $result
          (global.get ${token}))
        (br $out)))
`).join('')}
${Object.entries({
  '!': '$TOKEN_BANG',
  '=': '$TOKEN_EQUAL',
  '<': '$TOKEN_LESS',
  '>': '$TOKEN_GREATER',
}).map(([char, token]) => `;;wasm
    (if
      (i32.eq
        (local.get $char)
        (i32.const ${charToHex(char)}))
      (then
        (if
          (call $match
            (local.get $end)
            (local.get $current)
            (i32.const ${charToHex('=')}))
          (then
            (local.set $current
              (i32.add
                (local.get $current)
                (i32.const 1)))
            (local.set $result
              (global.get ${token}_EQUAL)))
          (else
            (local.set $result
              (global.get ${token}))))
        (br $out)))
`).join('')}
    (if
      (i32.eq
        (local.get $char)
        (i32.const ${charToHex('"')}))
      (then
        (loop $consume_string
          (local.set $current
            (i32.add
              (local.get $current)
              (i32.const 1)))
          (if
            (i32.eq
              (local.get $current)
              (local.get $end))
            (then
              (local.set $result
                (global.get $TOKEN_EOF)) ;; expected '"' got EOF
              (br $out)))
          (if
            (call $match
              (local.get $end)
              (local.get $current)
              (i32.const ${charToHex('"')}))
            (then
              (local.set $result
                (global.get $TOKEN_STRING))
              (local.set $current
                (i32.add
                  (local.get $current)
                  (i32.const 1))) ;; consume closing quote
              (br $out)))
          (br $consume_string))))
    (if
      (call $is_digit
        (local.get $char))
      (then
        (block $end_number
          (loop $consume_number
            (if
              (i32.eq
                (i32.add
                  (local.get $current)
                  (i32.const 1))
                (local.get $end))
              (then
                (br $end_number)))
            (local.set $current
              (i32.add
                (local.get $current)
                (i32.const 1)))
            (local.set $char
              (i32.load8_u
                (local.get $current)))
            (if
              (call $is_digit
                (local.get $char))
              (then
                (br $consume_number))))
          (if
            (i32.and
              (i32.eq
                (local.get $char)
                (i32.const ${charToHex('.')}))
              (call $is_digit
                (i32.load8_u
                  (i32.add
                    (local.get $current)
                    (i32.const 1)))))
            (then
              (local.set $current
                (i32.add
                  (local.get $current)
                  (i32.const 1)))
              (loop $consume_decimal
                (if
                  (i32.eq
                    (i32.add
                      (local.get $current)
                      (i32.const 1))
                    (local.get $end))
                  (then
                    (br $end_number)))
                (local.set $current
                  (i32.add
                    (local.get $current)
                    (i32.const 1)))
                (if
                  (call $is_digit
                    (i32.load8_u
                      (local.get $current)))
                  (then
                    (br $consume_decimal)))))))
        (local.set $result
          (global.get $TOKEN_NUMBER))
        (br $out)))
    (if
      (call $is_alpha
        (local.get $char))
      (then
        (block $end_identifier
          (loop $consume_identifier
            (if
              (i32.eq
                (i32.add
                  (local.get $current)
                  (i32.const 1))
                (local.get $end))
              (then
                (br $end_identifier)))
            (local.set $current
              (i32.add
                (local.get $current)
                (i32.const 1)))
            (local.set $char
              (i32.load8_u
                (local.get $current)))
            (if
              (i32.or
                (call $is_alpha
                  (local.get $char))
                (call $is_digit
                  (local.get $char)))
              (then
                (br $consume_identifier)))))
      (local.set $len
        (i32.sub
          (local.get $current)
          (local.get $start)))
${Object.entries({
  'and': '$TOKEN_AND',
  'class': '$TOKEN_CLASS',
  'else': '$TOKEN_ELSE',
  'if': '$TOKEN_IF',
  'nil': '$TOKEN_NIL',
  'or': '$TOKEN_OR',
  'print': '$TOKEN_PRINT',
  'return': '$TOKEN_RETURN',
  'var': '$TOKEN_VAR',
  'while': '$TOKEN_WHILE',
}).map(([keyword, token]) => `;;wasm
      (block $check_${keyword}
        (if
          (i32.and
            (i32.eq
              (i32.load8_u
                (local.get $start))
              (i32.const ${charToHex(keyword[0])}))
            (i32.eq
              (local.get $len)
              (i32.const ${keyword.length})))
          (then
${keyword.slice(1).split('').map((c, i) => `;;wasm
            (if
              (i32.ne
                (i32.load8_u
                  (i32.add
                    (local.get $start)
                    (i32.const ${i + 1})))
                (i32.const ${charToHex(c)}))
              (then
                (br $check_${keyword})))
`).join('')}
        (local.set $result
          (global.get ${token}))
        (br $out))))
`).join('')}
      (local.set $result
        (global.get $TOKEN_IDENTIFIER))
      (br $out)))
  ) ;; out
  (local.set $current
    (i32.add
      (local.get $current)
      (i32.const 1)))
  (;if
    (i32.ne
      (local.get $result)
      (global.get $TOKEN_EOF))
    (then
      (call $logString
        (local.get $start)
        (i32.sub
          (local.get $current)
          (local.get $start))));)
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 4)) ;; *current
      (local.get $current))
  (local.get $result))
`;
