import { charToHex, watSwitch } from "./common";

export enum NATIVE {
  NATIVE_NOW = 1,
}

export default `;;wasm
(func $init_native
  (local $charptr i32)
  (local.set $charptr
    (call $alloc
      (i32.const 3)))
  (i32.store
    (local.get $charptr)
    (i32.const ${charToHex('n')}))
  (i32.store
    (i32.add
      (local.get $charptr)
      (i32.const 4))
    (i32.const ${charToHex('o')}))
  (i32.store
    (i32.add
      (local.get $charptr)
      (i32.const 8))
    (i32.const ${charToHex('w')}))
  (drop
    (call $table_set
      (global.get $table)
      (call $new_string
        (local.get $charptr))
      (call $new_native
        (i32.const ${NATIVE.NATIVE_NOW})))))
(func $native
  (param $NATIVE i32)
  (result f64)
  (local $result f64)
${watSwitch(
  `;;wasm
  (local.get $NATIVE)`,
  [
    [
      NATIVE.NATIVE_NOW,
      `;;wasm
      (local.set $result
        (call $now))
      (br $break)`
    ],
  ]
)}
  (local.get $result))
`;