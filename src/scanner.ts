import { enumToGlobals } from './common';

export enum TOKENS {
  TOKEN_LEFT_PAREN = 1,
  // todo: other tokens
  TOKEN_EOF,
}

export default `;;wasm
${enumToGlobals(TOKENS)}
(; typedef struct {
  i8 *start;
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
    (local.get $this) ;; *start
    (local.get $srcptr))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 4)) ;; *end
    (i32.add
      (local.get $srcptr)
      (call $get_len
        (local.get $srcptr))))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 8)) ;; *current
    (local.get $srcptr))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 12)) ;; line
    (i32.const 1))
  (global.set $scanner
    (local.get $this)))
(func $scan_token
  (result i32)
  (local $this i32)
  (local $start i32)
  (local $end i32)
  (local $current i32)
  (local $result i32)
  (local.set $this
    (global.get $scanner))
  (local.set $end
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 4)))) ;; *end
  (local.set $current
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 8)))) ;; *current
  (if
    (i32.eq
      (local.get $current)
      (local.get $end))
    (then
      (local.set $result
        (global.get $TOKEN_EOF)))
    (else
      (local.set $result
        (global.get $TOKEN_LEFT_PAREN)))) ;; todo: scan :allthethings:
  (local.set $start
      (local.get $current))
  (local.set $current
    (i32.add
      (local.get $current)
      (i32.const 1)))
  (i32.store
    (local.get $this) ;; *start
    (local.get $start))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 8)) ;; *current
    (local.get $current))
  (local.get $result))
`;
