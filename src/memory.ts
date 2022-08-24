// todo: realloc & free
export default `;;wasm
(global $top_of_heap
  (mut i32)
  (i32.const 0))
(func $init_memory
  (param $startptr i32)
  (global.set $top_of_heap
    (local.get $startptr)))
(func $alloc
  (param $size i32)
  (result i32)
  (local $pointer i32)
  (local.set $pointer
    (i32.add
      (global.get $top_of_heap)
      (i32.const 4))) ;; sizeof i32
  (i32.store
    (global.get $top_of_heap)
    (local.get $size))
  (global.set $top_of_heap
    (i32.add
      (global.get $top_of_heap)
      (i32.mul
        (i32.add
          (local.get $size)
          (i32.const 1))
        (i32.const 4)))) ;; sizeof i32
  (local.get $pointer))
(func $get_len
  (param $pointer i32)
  (result i32)
  (i32.load
    (i32.sub
      (local.get $pointer)
      (i32.const 4)))) ;; len stored before ptr
`;
