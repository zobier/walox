import { struct } from './common';

const Table = struct([
  ['count', 'i32'],
  ['capacity', 'i32'],
  ['*entries', 'i32'],
]);
const Entry = struct([
  ['*key', 'i32'],
  ['value', 'f64'],
]);

export default `;;wasm
(func $init_table
  (result i32)
  (local $this i32)
  (local $capacity i32)
  (local.set $this
    ${Table.alloc()})
  (local.set $capacity
    (i32.const 32))
  ${Table.set(
    'capacity',
    `;;wasm
    (local.get $this)`,
    `;;wasm
    (local.get $capacity)`,
  )}
  ${Table.set(
    '*entries',
    `;;wasm
    (local.get $this)`,
    `;;wasm
    (call $alloc
      (i32.mul
        (local.get $capacity)
        (i32.const 3)))`, // Entry.size() / 4? why alloc words rather than bytes?
  )}
  (local.get $this))
(func $get_entryptr
  (param $table i32)
  (param $i i32)
  (result i32)
  (i32.add
    ${Table.get(
      '*entries',
      `;;wasm
      (local.get $table)`,
    )}
    (i32.mul
      (local.get $i)
      (i32.const ${Entry.size()}))))
(func $find_entry
  (param $table i32)
  (param $key f64)
  (result i32)
  (local $capacity i32)
  (local $i i32)
  (local $entryptr i32)
  (local $keyptr i32)
  (local.set $capacity
    ${Table.get(
      'capacity',
      `;;wasm
      (local.get $table)`,
    )})
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
          (local.get $table)
          (local.get $i)))
      (local.set $keyptr
        ${Entry.get(
          '*key',
          `;;wasm
          (local.get $entryptr)`,
        )})
      (if
        (i32.eq
          (local.get $keyptr)
          (i32.const 0)) ;; null??
        (then
          (br $out)))
      (if
        (call $str_cmp
          (call $get_string
            (local.get $key))
          (local.get $keyptr))
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
  (param $table i32)
  (param $key f64)
  (param $value f64)
  (result i32)
  ;; todo: realloc if count > capacity * MAX_LOAD
  (local $count i32)
  (local $entryptr i32)
  (local $new_key i32)
  (local.set $count
    ${Table.get(
      'count',
      `;;wasm
      (local.get $table)`,
    )})
  (local.set $entryptr
    (call $find_entry
      (local.get $table)
      (local.get $key)))
  (local.set $new_key
    (i32.eq
      ${Entry.get(
        '*key',
        `;;wasm
        (local.get $entryptr)`,
      )}
      (i32.const 0))) ;; null??
  (if
    (local.get $new_key)
    (then
      ${Table.set(
        'count',
        `;;wasm
        (local.get $table)`,
        `;;wasm
        (i32.add
          (local.get $count)
          (i32.const 1))`,
      )}))
  ${Entry.set(
    '*key',
    `;;wasm
    (local.get $entryptr)`,
    `;;wasm
    (call $get_string
      (local.get $key))`,
  )}
  ${Entry.set(
    'value',
    `;;wasm
    (local.get $entryptr)`,
    `;;wasm
    (local.get $value)`,
  )}
  (local.get $new_key))
(func $table_get
  (param $table i32)
  (param $key f64)
  (result f64)
  (local $entryptr i32)
  (local.set $entryptr
    (call $find_entry
      (local.get $table)
      (local.get $key)))
  ${Entry.get(
    'value',
    `;;wasm
    (local.get $entryptr)`,
  )})
;; todo: table_delete key
`;
