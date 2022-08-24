export default `;;wasm
(; typedef struct {
  i32 *key
  f64 value
} Entry
typedef struct {
  i32 count;
  i32 capacity;
  Entry *entries;
} Table ;)
(global $table
  (mut i32)
  (i32.const 0))
(func $init_table
  (local $this i32)
  (local $capacity i32)
  (local.set $this
    (call $alloc
      (i32.const 3)))
  (local.set $capacity
    (i32.const 32))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 4)) ;; capacity
    (local.get $capacity))
  (i32.store
    (i32.add
      (local.get $this)
      (i32.const 8)) ;; *values
    (call $alloc
      (i32.mul
        (local.get $capacity)
        (i32.const 3))))
  (global.set $table
    (local.get $this)))
(func $get_entryptr
  (param $i i32)
  (result i32)
  (local $this i32)
  (local.set $this
    (global.get $table))
  (i32.add
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 8))) ;; *entries
    (i32.mul
      (local.get $i)
      (i32.const 12)))) ;; 96 / 8
(func $find_entry
  (param $key f64)
  (result i32)
  (local $this i32)
  (local $capacity i32)
  (local $i i32)
  (local $entryptr i32)
  (local.set $this
    (global.get $table))
  (local.set $capacity
    (i32.load
      (i32.add
        (local.get $this)
        (i32.const 4)))) ;; capacity
  (local.set $i
    (i32.and
      (call $get_hash
        (local.get $key))
      (i32.sub
        (local.get $capacity)
        (i32.const 1))))
  (block $out
    (loop $find
      (local.set $entryptr
        (call $get_entryptr
          (local.get $i)))
      (if
        (i32.or
          (i32.eq
            (i32.load
              (local.get $entryptr))
            (i32.const 0)) ;; null??
          (call $str_cmp
            (call $get_string
              (local.get $key))
            (local.get $entryptr)))
        (then
          (br $out)))
      (local.set $i
        (i32.and
          (i32.add
            (local.get $i)
            (i32.const 1))
          (i32.sub
            (local.get $capacity)
            (i32.const 1))))
      (br $find)))
  (local.get $entryptr))
(func $table_set
  (param $key f64)
  (param $value f64)
  (result i32)
  ;; todo: realloc if count > capacity * MAX_LOAD
  (local $this i32)
  (local $count i32)
  (local $entryptr i32)
  (local $new_key i32)
  (local.set $this
    (global.get $table))
  (local.set $count
    (i32.load
      (local.get $this)))
  (local.set $entryptr
    (call $find_entry
      (local.get $key)))
  (local.set $new_key
    (i32.eq
      (i32.load
        (local.get $entryptr))
      (i32.const 0))) ;; null??
  (if
    (local.get $new_key)
    (then
      (i32.store
        (local.get $this) ;; count
        (i32.add
          (local.get $count)
          (i32.const 1)))))
  (i32.store
    (local.get $entryptr)
    (call $get_string
      (local.get $key)))
  (f64.store
    (i32.add
      (local.get $entryptr)
      (i32.const 4))
    (local.get $value))
  (local.get $new_key))
(func $table_get
  (param $key f64)
  (result f64)
  (local $this i32)
  (local $entryptr i32)
  (local.set $this
    (global.get $table))
  (local.set $entryptr
    (call $find_entry
      (local.get $key)))
  (f64.load
    (i32.add
      (local.get $entryptr)
      (i32.const 4))))
`;
