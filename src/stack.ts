export default `;;wasm
(; typedef struct {
  f64 *top_of_stack;
  f64 *stack;
} Stack ;)
(global $stack
  (mut i32)
  (i32.const 0))
(func $init_stack
  (local $this i32)
  (local.set $this
    (call $alloc
      (i32.const 2040)))
  (i32.store
    (local.get $this) ;; *top_of_stack
    (i32.add
      (local.get $this)
      (i32.const 4)))
  (global.set $stack
    (local.get $this)))
(func $push
  (param $value f64)
  (local $this i32)
  (local $top_of_stack i32)
  (local.set $this
    (global.get $stack))
  (local.set $top_of_stack
    (i32.load
      (local.get $this)))
  (f64.store
    (local.get $top_of_stack)
    (local.get $value))
  (i32.store
    (local.get $this)
    (i32.add
      (local.get $top_of_stack)
      (i32.const 8)))) ;; 64 / 8
(func $peek ;; should this return a value rather than ptr
  (param $i i32)
  (result i32)
  (i32.sub
    (i32.load
      (global.get $stack))
    (i32.mul
      (i32.add
        (local.get $i)
        (i32.const 1))
      (i32.const 8)))) ;; 64 / 8
(func $pop
  (result f64)
  (local $this i32)
  (local $top_of_stack i32)
  (local $value f64)
  (local.set $this
    (global.get $stack))
  (local.set $top_of_stack
    (i32.sub
      (i32.load
        (local.get $this))
      (i32.const 8))) ;; 64 / 8
  (local.set $value
    (f64.load
      (local.get $top_of_stack)))
  (i32.store
    (local.get $this)
    (local.get $top_of_stack))
  (local.get $value))
`;
