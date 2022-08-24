import { struct } from './common';

export enum OBJ_TYPE {
  OBJ_CLASS = 1,
  OBJ_CLOSURE,
  OBJ_FUNCTION,
  OBJ_INSTANCE,
  OBJ_NATIVE,
  OBJ_STRING,
  OBJ_UPVALUE,
}

const ObjString = struct([
  ['OBJ_TYPE', 'i32'],
  ['*chars', 'i32'],
  ['hash', 'i32'],
]);
const ObjUpvalue = struct([
  ['OBJ_TYPE', 'i32'],
  ['*location', 'i32'],
  ['closed', 'f64'],
  ['*next', 'i32'],
]);
const ObjFunction = struct([
  ['OBJ_TYPE', 'i32'],
  ['arity', 'i32'],
  ['upvalue_count', 'i32'],
  ['*chunk', 'i32'],
  ['*name', 'i32'],
]);
const ObjNative = struct([
  ['OBJ_TYPE', 'i32'],
  ['NATIVE', 'i32'],
]);
const ObjClosure = struct([
  ['OBJ_TYPE', 'i32'],
  ['*function', 'i32'],
  ['**upvalue', 'i32'],
]);
const ObjClass = struct([
  ['OBJ_TYPE', 'i32'],
  ['*name', 'i32'],
]);
const ObjInstance = struct([
  ['OBJ_TYPE', 'i32'],
  ['*class', 'i32'],
  ['*fields', 'i32'],
]);

export default `;;wasm
(func $hash
  (param $charptr i32)
  (result i32)
  (local $len i32)
  (local $i i32)
  (local $result i32)
  (local.set $len
    (call $get_len
      (local.get $charptr)))
  (local.set $i
    (i32.const 0))
  (local.set $result
    (i32.const 2166136261))
  (loop $hash
    (local.set $result
      (i32.xor
        (local.get $result)
        (i32.load
          (i32.add
            (local.get $charptr)
            (i32.mul
              (local.get $i)
              (i32.const 4))))))
    (local.set $result
      (i32.mul
        (local.get $result)
        (i32.const 16777619)))
    (br_if $hash
      (i32.lt_u
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 1)))
        (local.get $len))))
  (local.get $result))
(func $new_string
  (param $charptr i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    ${ObjString.alloc()})
  ${ObjString.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_STRING})`,
  )}
  ${ObjString.set(
    '*chars',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (local.get $charptr)`,
  )}
  ${ObjString.set(
    'hash',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (call $hash
      (local.get $charptr))`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $new_upvalue
  (param $valueptr i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    ${ObjUpvalue.alloc()})
  ${ObjUpvalue.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_UPVALUE})`,
  )}
  ${ObjUpvalue.set(
    '*location',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (local.get $valueptr)`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $new_function
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    ${ObjFunction.alloc()})
  ${ObjFunction.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_FUNCTION})`,
  )}
  ${ObjFunction.set(
    'arity',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const 0)`,
  )}
  ${ObjFunction.set(
    'upvalue_count',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const 0)`,
  )}
  ${ObjFunction.set(
    '*chunk',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (call $init_chunk)`,
  )}
  ${ObjFunction.set(
    '*name',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const 0)`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $new_native
  (param $NATIVE i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    ${ObjNative.alloc()})
  ${ObjNative.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_NATIVE})`,
  )}
  ${ObjNative.set(
    'NATIVE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (local.get $NATIVE)`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $new_closure
  (param $funcptr i32)
  (result f64)
  (local $ptr i32)
  (local $upvalue_count i32)
  (local.set $ptr
    ${ObjClosure.alloc()})
  ${ObjClosure.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_CLOSURE})`,
  )}
  ${ObjClosure.set(
    '*function',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (local.get $funcptr)`,
  )}
  (local.set $upvalue_count
    (call $get_upvalue_count
      (call $obj_val
        (local.get $funcptr))))
  ${ObjClosure.set(
    '**upvalue',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (call $alloc
      (local.get $upvalue_count))`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $new_class
  (param $nameptr i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    ${ObjClass.alloc()})
  ${ObjClass.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_CLASS})`,
  )}
  ${ObjClass.set(
    '*name',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (local.get $nameptr)`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $new_instance
  (param $classptr i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    ${ObjInstance.alloc()})
  ${ObjInstance.set(
    'OBJ_TYPE',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (i32.const ${OBJ_TYPE.OBJ_INSTANCE})`,
  )}
  ${ObjInstance.set(
    '*class',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (local.get $classptr)`,
  )}
  ${ObjInstance.set(
    '*fields',
    `;;wasm
    (local.get $ptr)`,
    `;;wasm
    (call $init_table)`,
  )}
  (call $obj_val
    (local.get $ptr)))
(func $is_obj_type
  (param $v f64)
  (param $type i32)
  (result i32)
  (if
    (result i32)
    (call $is_obj
      (local.get $v))
    (then
      (i32.eq
        (call $get_obj_type
          (local.get $v))
        (local.get $type)))
    (else
      (i32.const 0))))
(func $get_obj_type
  (param $v f64)
  (result i32)
  (i32.load
    (call $as_obj
      (local.get $v))))
(func $get_string
  (param $v f64)
  (result i32)
  ${ObjString.get(
    '*chars',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $get_hash
  (param $v f64)
  (result i32)
  ${ObjString.get(
    'hash',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $get_arity
  (param $v f64)
  (result i32)
  ${ObjFunction.get(
    'arity',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $set_arity
  (param $v f64)
  (param $arity i32)
  ${ObjFunction.set(
    'arity',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
    `;;wasm
    (local.get $arity)`,
  )})
(func $get_upvalue_count
  (param $v f64)
  (result i32)
  ${ObjFunction.get(
    'upvalue_count',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $set_upvalue_count
  (param $v f64)
  (param $upvalue_count i32)
  ${ObjFunction.set(
    'upvalue_count',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
    `;;wasm
    (local.get $upvalue_count)`,
  )})
(func $get_chunk
  (param $v f64)
  (result i32)
  ${ObjFunction.get(
    '*chunk',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $get_name
  (param $v f64)
  (result i32)
  ${ObjFunction.get(
    '*name',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $set_name
  (param $v f64)
  (param $name i32)
  ${ObjFunction.set(
    '*name',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
    `;;wasm
    (local.get $name)`,
  )})
(func $get_native
  (param $v f64)
  (result i32)
  ${ObjNative.get(
    'NATIVE',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $get_closure_function
  (param $v f64)
  (result f64)
  (call $obj_val
    ${ObjClosure.get(
      '*function',
      `;;wasm
      (call $as_obj
        (local.get $v))`,
    )}))
(func $get_upvalue
  (param $v f64)
  (param $i i32)
  (result f64)
  (call $obj_val
    (i32.load
      (i32.add
        ${ObjClosure.get(
          '**upvalue',
          `;;wasm
          (call $as_obj
            (local.get $v))`,
        )}
        (i32.mul
          (local.get $i)
          (i32.const 4))))))
(func $set_upvalue
  (param $v f64)
  (param $i i32)
  (param $upvalue f64)
  (i32.store
    (i32.add
      ${ObjClosure.get(
        '**upvalue',
        `;;wasm
        (call $as_obj
          (local.get $v))`,
      )}
      (i32.mul
        (local.get $i)
        (i32.const 4)))
    (call $as_obj
      (local.get $upvalue))))
(func $get_upvalue_location
  (param $v f64)
  (result i32)
  ${ObjUpvalue.get(
    '*location',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $set_upvalue_location
  (param $v f64)
  (param $valueptr i32)
  ${ObjUpvalue.set(
    '*location',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
    `;;wasm
    (local.get $valueptr)`,
  )})
(func $get_upvalue_next
  (param $v f64)
  (result f64)
  (call $obj_val
    ${ObjUpvalue.get(
      '*next',
      `;;wasm
      (i32.load
        (call $as_obj
          (local.get $v)))`,
    )}))
(func $set_upvalue_next
  (param $v f64)
  (param $value f64)
  ${ObjUpvalue.set(
    '*next',
    `;;wasm
    (i32.load
      (call $as_obj
        (local.get $v)))`,
    `;;wasm
    (call $as_obj
      (local.get $value))`,
  )})
(func $set_upvalue_closed
  (param $v f64)
  (local $closed i32)
  (local.set $closed
    ${ObjUpvalue.addr(
      'closed',
      `;;wasm
      (i32.load
        (call $as_obj
          (local.get $v)))`,
    )})
  (f64.store
    (local.get $closed)
    (f64.load
      (call $get_upvalue_location
        (local.get $v))))
  (call $set_upvalue_location
    (local.get $v)
    (local.get $closed)))
(func $get_classname
  (param $v f64)
  (result i32)
  ${ObjClass.get(
    '*name',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $get_class
  (param $v f64)
  (result i32)
  ${ObjInstance.get(
    '*class',
    `;;wasm
    (call $as_obj
      (local.get $v))`,
  )})
(func $copy_string
  (param $start i32)
  (param $len i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    (call $alloc
      (local.get $len)))
  (call $mem_copy
    (local.get $start)
    (local.get $ptr)
    (local.get $len))
  (call $new_string
    (local.get $ptr)))
(func $str_cmp
  (param $a i32)
  (param $b i32)
  (result i32)
  (local $len i32)
  (local $i i32)
  (local $result i32)
  (local.set $len
    (call $get_len
      (local.get $a)))
  (local.set $i
    (i32.const 0))
  (if
    (i32.eq
      (local.get $len)
      (call $get_len
        (local.get $b)))
    (then
      (local.set $result
        (i32.const 1))
      (loop $cmp
        (local.set $result
          (i32.and
            (local.get $result)
            (i32.eq
              (i32.load
                (i32.add
                  (local.get $a)
                  (i32.mul
                    (local.get $i)
                    (i32.const 4))))
              (i32.load
                (i32.add
                  (local.get $b)
                  (i32.mul
                    (local.get $i)
                    (i32.const 4)))))))
        (br_if $cmp
          (i32.lt_u
            (local.tee $i
              (i32.add
                (local.get $i)
                (i32.const 1)))
            (local.get $len))))))
  (local.get $result))
(func $concatenate
  (param $a i32)
  (param $b i32)
  (result f64)
  (local $ptr i32)
  (local $alen i32)
  (local $blen i32)
  (local.set $alen
    (call $get_len
      (local.get $a)))
  (local.set $blen
    (call $get_len
      (local.get $b)))
  (local.set $ptr
    (call $alloc
      (i32.add
        (local.get $alen)
        (local.get $blen))))
  (call $mem_copy
    (local.get $a)
    (local.get $ptr)
    (local.get $alen))
  (call $mem_copy
    (local.get $b)
    (i32.add
      (local.get $ptr)
      (i32.mul
        (local.get $alen)
        (i32.const 4)))
    (local.get $blen))
  (call $new_string
    (local.get $ptr)))
`;
