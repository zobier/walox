export enum OBJ_TYPE {
  OBJ_CLOSURE = 1,
  OBJ_FUNCTION,
  OBJ_NATIVE,
  OBJ_STRING,
  OBJ_UPVALUE,
}

export default `;;wasm
(; typedef struct {
  i32 OBJ_TYPE;
  i32 *chars;
  i32 hash;
} ObjString
typeder struct {
  i32 OBJ_TYPE;
  i32 *location;
  f64 closed;
  i32 *next;
} ObjUpvalue
typedef struct {
  i32 OBJ_TYPE;
  i32 arity;
  i32 upvalue_count;
  i32 *chunk;
  i32 *name;
} ObjFunction
typedef struct {
  i32 OBJ_TYPE;
  i32 NATIVE;
} ObjNative
typedef struct {
  i32 OBJ_TYPE;
  i32 *function;
  i32 **upvalue;
} ObjClosure ;)
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
    (call $alloc
      (i32.const 3)))
  (i32.store
    (local.get $ptr)
    (i32.const ${OBJ_TYPE.OBJ_STRING}))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 4)) ;; *chars
    (local.get $charptr))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 8)) ;; hash
    (call $hash
      (local.get $charptr)))
  (call $obj_val
    (local.get $ptr)))
(func $new_upvalue
  (param $valueptr i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    (call $alloc
      (i32.const 5)))
  (i32.store
    (local.get $ptr)
    (i32.const ${OBJ_TYPE.OBJ_UPVALUE}))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 4)) ;; *location
    (local.get $valueptr))
  (call $obj_val
    (local.get $ptr)))
(func $new_function
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    (call $alloc
      (i32.const 4)))
  (i32.store
    (local.get $ptr)
    (i32.const ${OBJ_TYPE.OBJ_FUNCTION}))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 4)) ;; arity
    (i32.const 0))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 8)) ;; upvalue_count
    (i32.const 0))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 12)) ;; *chunk
    (call $init_chunk))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 16)) ;; *name
    (i32.const 0))
  (call $obj_val
    (local.get $ptr)))
(func $new_native
  (param $NATIVE i32)
  (result f64)
  (local $ptr i32)
  (local.set $ptr
    (call $alloc
      (i32.const 2)))
  (i32.store
    (local.get $ptr)
    (i32.const ${OBJ_TYPE.OBJ_NATIVE}))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 4)) ;; NATIVE
    (local.get $NATIVE))
  (call $obj_val
    (local.get $ptr)))
(func $new_closure
  (param $funcptr i32)
  (result f64)
  (local $ptr i32)
  (local $upvalue_count i32)
  (local.set $ptr
    (call $alloc
      (i32.const 2)))
  (i32.store
    (local.get $ptr)
    (i32.const ${OBJ_TYPE.OBJ_CLOSURE}))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 4)) ;; *function
    (local.get $funcptr))
  (local.set $upvalue_count
    (call $get_upvalue_count
      (call $obj_val
        (local.get $funcptr))))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 8)) ;; **upvalue
    (call $alloc
      (local.get $upvalue_count)))
  (call $obj_val
    (local.get $ptr)))
(func $is_string
  (param $v f64)
  (result i32)
  (if
    (result i32)
    (call $is_obj
      (local.get $v))
    (then
      (i32.eq
        (i32.load
          (call $as_obj
            (local.get $v)))
        (i32.const ${OBJ_TYPE.OBJ_STRING})))
    (else
      (i32.const 0))))
(func $is_function
  (param $v f64)
  (result i32)
  (if
    (result i32)
    (call $is_obj
      (local.get $v))
    (then
      (i32.eq
        (i32.load
          (call $as_obj
            (local.get $v)))
        (i32.const ${OBJ_TYPE.OBJ_FUNCTION})))
    (else
      (i32.const 0))))
(func $is_native
  (param $v f64)
  (result i32)
  (if
    (result i32)
    (call $is_obj
      (local.get $v))
    (then
      (i32.eq
        (i32.load
          (call $as_obj
            (local.get $v)))
        (i32.const ${OBJ_TYPE.OBJ_NATIVE})))
    (else
      (i32.const 0))))
(func $is_closure
  (param $v f64)
  (result i32)
  (if
    (result i32)
    (call $is_obj
      (local.get $v))
    (then
      (i32.eq
        (i32.load
          (call $as_obj
            (local.get $v)))
        (i32.const ${OBJ_TYPE.OBJ_CLOSURE})))
    (else
      (i32.const 0))))
(func $get_string
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)))) ;; *chars
(func $get_hash
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 8)))) ;; hash
(func $get_arity
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)))) ;; arity
(func $set_arity
  (param $v f64)
  (param $arity i32)
  (i32.store
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)) ;; arity
    (local.get $arity)))
(func $get_upvalue_count
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 8)))) ;; upvalue_count
(func $set_upvalue_count
  (param $v f64)
  (param $upvalue_count i32)
  (i32.store
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 8)) ;; upvalue_count
    (local.get $upvalue_count)))
(func $get_chunk
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 12)))) ;; *chunk
(func $get_name
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 16)))) ;; name
(func $set_name
  (param $v f64)
  (param $name i32)
  (i32.store
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 16)) ;; name
    (local.get $name)))
(func $get_native
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)))) ;; NATIVE
(func $get_closure_function
  (param $v f64)
  (result f64)
  (call $obj_val
    (i32.load
      (i32.add
        (call $as_obj
          (local.get $v))
        (i32.const 4))))) ;; *function
(func $get_upvalue
  (param $v f64)
  (param $i i32)
  (result f64)
  (call $obj_val
    (i32.load
      (i32.add
        (i32.load
          (i32.add
            (call $as_obj
              (local.get $v))
            (i32.const 8))) ;; **upvalue
        (i32.mul
          (local.get $i)
          (i32.const 4))))))
(func $set_upvalue
  (param $v f64)
  (param $i i32)
  (param $upvalue f64)
  (i32.store
    (i32.add
      (i32.load
        (i32.add
          (call $as_obj
            (local.get $v))
          (i32.const 8))) ;; **upvalue
      (i32.mul
        (local.get $i)
        (i32.const 4)))
    (call $as_obj
      (local.get $upvalue))))
(func $get_upvalue_location
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)))) ;; *location
(func $set_upvalue_location
  (param $v f64)
  (param $valueptr i32)
  (i32.store
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)) ;; *location
    (local.get $valueptr)))
(func $get_upvalue_next
  (param $v f64)
  (result f64)
  (call $obj_val
    (i32.load
      (i32.add
        (i32.load
          (call $as_obj
            (local.get $v)))
        (i32.const 16))))) ;; *next
(func $set_upvalue_next
  (param $v f64)
  (param $value f64)
  (i32.store
    (i32.add
      (i32.load
        (call $as_obj
          (local.get $v)))
      (i32.const 16)) ;; *next
    (call $as_obj
      (local.get $value))))
(func $set_upvalue_closed
  (param $v f64)
  (local $closed i32)
  (local.set $closed
    (i32.add
      (i32.load
        (call $as_obj
          (local.get $v)))
      (i32.const 8))) ;; *closed
  (f64.store
    (local.get $closed)
    (f64.load
      (call $get_upvalue_location
        (local.get $v))))
  (call $set_upvalue_location
    (local.get $v)
    (local.get $closed)))
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
