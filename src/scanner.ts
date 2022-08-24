import { charToHex, indent, struct } from './common';

export enum TOKENS {
  // Single-character tokens.
  TOKEN_LEFT_PAREN = 1,
  TOKEN_RIGHT_PAREN,
  TOKEN_LEFT_BRACE,
  TOKEN_RIGHT_BRACE,
  TOKEN_COMMA,
  TOKEN_DOT,
  TOKEN_MINUS,
  TOKEN_PLUS,
  TOKEN_SEMICOLON,
  TOKEN_SLASH,
  TOKEN_STAR,
  // One or two character tokens.
  TOKEN_BANG,
  TOKEN_BANG_EQUAL,
  TOKEN_EQUAL,
  TOKEN_EQUAL_EQUAL,
  TOKEN_GREATER,
  TOKEN_GREATER_EQUAL,
  TOKEN_LESS,
  TOKEN_LESS_EQUAL,
  // Literals.
  TOKEN_IDENTIFIER,
  TOKEN_STRING,
  TOKEN_NUMBER,
  // Keywords.
  TOKEN_AND,
  TOKEN_CLASS,
  TOKEN_ELSE,
  TOKEN_FALSE,
  TOKEN_FOR,
  TOKEN_FUN,
  TOKEN_IF,
  TOKEN_NIL,
  TOKEN_OR,
  TOKEN_PRINT,
  TOKEN_RETURN,
  TOKEN_SUPER,
  TOKEN_THIS,
  TOKEN_TRUE,
  TOKEN_VAR,
  TOKEN_WHILE,

  TOKEN_ERROR,
  TOKEN_EOF,
}

const Scanner = struct([
  ['*end', 'i32'],
  ['*current', 'i32'],
  ['line', 'i32'],
]);

export default `;;wasm
(global $scanner
  (mut i32)
  (i32.const 0))
(func $init_scanner
  (param $srcptr i32)
  (local $this i32)
  (local.set $this
    ${Scanner.alloc()})
  ${Scanner.set(
    '*end',
    `;;wasm
    (local.get $this)`,
    `;;wasm
    (i32.add
      (local.get $srcptr)
      (i32.mul
      (call $get_len
        (local.get $srcptr))
      (i32.const 4)))`,
  )}
  ${Scanner.set(
    '*current',
    `;;wasm
    (local.get $this)`,
    `;;wasm
    (local.get $srcptr)`,
  )}
  ${Scanner.set(
    'line',
    `;;wasm
    (local.get $this)`,
    `;;wasm
    (i32.const 1)`,
  )}
  (global.set $scanner
    (local.get $this)))
(func $match
  (param $end i32)
  (param $current i32)
  (param $expected i32)
  (result i32)
  (if
    (result i32)
    (i32.eq
      (local.get $current)
      (local.get $end))
    (then
      (i32.const 0))
    (else
      (i32.eq
        (i32.load
          (i32.add
            (local.get $current)
            (i32.const 4)))
        (local.get $expected)))))
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
  (result i32 i32 i32)
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
    ${Scanner.get(
      '*end',
      `;;wasm
      (local.get $this)`,
    )})
  (local.set $current
    ${Scanner.get(
      '*current',
      `;;wasm
      (local.get $this)`,
    )})
  (block $out
    (block $end_whitespace
      (loop $skip_whitespace
        (local.set $char
          (i32.load
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
                (i32.const 4)))
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
                        (i32.const 4)))
                    (if
                      (i32.eq
                        (local.get $current)
                        (local.get $end))
                      (then
                        (local.set $result
                          (i32.const ${TOKENS.TOKEN_EOF}))
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
    (if
      (i32.eq
        (local.get $current)
        (local.get $end))
      (then
        (local.set $result
          (i32.const ${TOKENS.TOKEN_EOF}))
        (br $out)))
    (local.set $start
      (local.get $current))
${Object.entries({
  '(': TOKENS.TOKEN_LEFT_PAREN,
  ')': TOKENS.TOKEN_RIGHT_PAREN,
  '{': TOKENS.TOKEN_LEFT_BRACE,
  '}': TOKENS.TOKEN_RIGHT_BRACE,
  ';': TOKENS.TOKEN_SEMICOLON,
  ',': TOKENS.TOKEN_COMMA,
  '.': TOKENS.TOKEN_DOT,
  '-': TOKENS.TOKEN_MINUS,
  '+': TOKENS.TOKEN_PLUS,
  '/': TOKENS.TOKEN_SLASH,
  '*': TOKENS.TOKEN_STAR,
})
  .map(
    ([char, token]) => `;;wasm
    (if
      (i32.eq
        (local.get $char)
        (i32.const ${charToHex(char)}))
      (then
        (local.set $result
          (i32.const ${token}))
        (br $out)))
`,
  )
  .join('')}
${Object.entries({
  '!': [TOKENS.TOKEN_BANG, TOKENS.TOKEN_BANG_EQUAL],
  '=': [TOKENS.TOKEN_EQUAL, TOKENS.TOKEN_EQUAL_EQUAL],
  '<': [TOKENS.TOKEN_LESS, TOKENS.TOKEN_LESS_EQUAL],
  '>': [TOKENS.TOKEN_GREATER, TOKENS.TOKEN_GREATER_EQUAL],
})
  .map(
    ([char, token]) => `;;wasm
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
                (i32.const 4)))
            (local.set $result
              (i32.const ${token[1]})))
          (else
            (local.set $result
              (i32.const ${token[0]}))))
        (br $out)))
`,
  )
  .join('')}
    (if
      (i32.eq
        (local.get $char)
        (i32.const ${charToHex('"')}))
      (then
        (loop $consume_string
          (local.set $current
            (i32.add
              (local.get $current)
              (i32.const 4)))
          (if
            (i32.eq
              (local.get $current)
              (local.get $end))
            (then
              (local.set $result
                (i32.const ${TOKENS.TOKEN_EOF})) ;; expected '"' got EOF
              (br $out)))
          (if
            (call $match
              (local.get $end)
              (local.get $current)
              (i32.const ${charToHex('"')}))
            (then
              (local.set $result
                (i32.const ${TOKENS.TOKEN_STRING}))
              (local.set $current
                (i32.add
                  (local.get $current)
                  (i32.const 4))) ;; consume closing quote
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
                  (i32.const 4))
                (local.get $end))
              (then
                (br $end_number)))
            (if
              (call $is_digit
                (i32.load
                  (i32.add
                    (local.get $current)
                    (i32.const 4))))
              (then
                (local.set $current
                  (i32.add
                    (local.get $current)
                    (i32.const 4)))
                (br $consume_number))))
          (if
            (i32.and
              (i32.eq
                (i32.load
                  (i32.add
                    (local.get $current)
                    (i32.const 4)))
                (i32.const ${charToHex('.')}))
              (call $is_digit
                (i32.load
                  (i32.add
                    (local.get $current)
                    (i32.const 8)))))
            (then
              (local.set $current
                (i32.add
                  (local.get $current)
                  (i32.const 8)))
              (loop $consume_decimal
                (if
                  (i32.eq
                    (i32.add
                      (local.get $current)
                      (i32.const 4))
                    (local.get $end))
                  (then
                    (br $end_number)))
                (if
                  (call $is_digit
                    (i32.load
                      (i32.add
                        (local.get $current)
                        (i32.const 4))))
                  (then
                    (local.set $current
                      (i32.add
                        (local.get $current)
                        (i32.const 4)))
                    (br $consume_decimal)))))))
        (local.set $result
          (i32.const ${TOKENS.TOKEN_NUMBER}))
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
                  (i32.const 4))
                (local.get $end))
              (then
                (br $end_identifier)))
            (local.set $char
              (i32.load
                (i32.add
                  (local.get $current)
                  (i32.const 4))))
            (if
              (i32.or
                (call $is_alpha
                  (local.get $char))
                (call $is_digit
                  (local.get $char)))
              (then
                (local.set $current
                  (i32.add
                    (local.get $current)
                    (i32.const 4)))
                (br $consume_identifier)))))
        (local.set $len
          (i32.add
            (i32.div_u
              (i32.sub
                (local.get $current)
                (local.get $start))
              (i32.const 4))
            (i32.const 1)))
${Object.entries({
  '': {
    and: TOKENS.TOKEN_AND,
    class: TOKENS.TOKEN_CLASS,
    else: TOKENS.TOKEN_ELSE,
    if: TOKENS.TOKEN_IF,
    nil: TOKENS.TOKEN_NIL,
    or: TOKENS.TOKEN_OR,
    print: TOKENS.TOKEN_PRINT,
    return: TOKENS.TOKEN_RETURN,
    var: TOKENS.TOKEN_VAR,
    while: TOKENS.TOKEN_WHILE,
  },
  f: {
    alse: TOKENS.TOKEN_FALSE,
    or: TOKENS.TOKEN_FOR,
    un: TOKENS.TOKEN_FUN,
  },
  t: {
    his: TOKENS.TOKEN_THIS,
    rue: TOKENS.TOKEN_TRUE,
  },
})
  .map(([prefix, alternatives]) => {
    const start = prefix
      ? `;;wasm
                  (i32.add
                    (local.get $start)
                    (i32.const 4))`
      : `;;wasm
                  (local.get $start)`;
    const offset = prefix ? 8 : 4;
    const cases = Object.entries(alternatives)
      .map(([rest, token]) => {
        const keyword = prefix + rest;

        return `;;wasm
        (block $check_${keyword}
          (if
            (i32.and
              (i32.eq
                (i32.load
${start})
                (i32.const ${charToHex(rest[0])}))
              (i32.eq
                (local.get $len)
                (i32.const ${keyword.length})))
            (then
${rest
  .slice(1)
  .split('')
  .map(
    (c, i) => `;;wasm
              (if
                (i32.ne
                  (i32.load
                    (i32.add
                      (local.get $start)
                      (i32.const ${i * 4 + offset})))
                  (i32.const ${charToHex(c)}))
                (then
                  (br $check_${keyword})))
`,
  )
  .join('')}
              (local.set $result
                (i32.const ${token}))
              (br $out))))
`;
      })
      .join('');

    return prefix
      ? `;;wasm
        (if
          (i32.and
            (i32.eq
              (i32.load
                (local.get $start))
              (i32.const ${charToHex(prefix)}))
            (i32.gt_u
              (local.get $len)
              (i32.const 1)))
          (then
${indent(cases, 4)}))`
      : cases;
  })
  .join('')}
      (local.set $result
        (i32.const ${TOKENS.TOKEN_IDENTIFIER}))
      (br $out)))
  ) ;; out
  (local.set $current
    (i32.add
      (local.get $current)
      (i32.const 4)))
  ${Scanner.set(
    '*current',
    `;;wasm
    (local.get $this)`,
    `;;wasm
    (local.get $current)`,
  )}
  (local.get $result)
  (local.get $start)
  (i32.div_u
    (i32.sub
      (local.get $current)
      (local.get $start))
    (i32.const 4)))
`;
