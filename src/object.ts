import { enumToGlobals } from "./common";

export enum OBJ_TYPE {
  OBJ_STRING = 1,
}

export default `;;wasm
(; struct ObjString {
  i32 OBJ_TYPE;
  i32 *chars;
} ;)
${enumToGlobals(OBJ_TYPE)}
(func $new_string
  (param $charptr i32)
  (result i32)
  (local $ptr i32)
  (local.set $ptr
    (call $alloc
      (i32.const 2)))
  (i32.store
    (local.get $ptr)
    (global.get $OBJ_STRING))
  (i32.store
    (i32.add
      (local.get $ptr)
      (i32.const 4)) ;; *chars
    (local.get $charptr))
  (local.get $ptr))
(func $is_string
  (param $v f64)
  (result i32)
  (i32.and
    (call $is_obj
      (local.get $v))
    (i32.eq
      (i32.load
        (call $as_obj
          (local.get $v)))
      (global.get $OBJ_STRING))))
(func $get_string
  (param $v f64)
  (result i32)
  (i32.load
    (i32.add
      (call $as_obj
        (local.get $v))
      (i32.const 4)))) ;; *chars
(func $mem_copy
  (param $from i32)
  (param $to i32)
  (param $len i32)
  (local $i i32)
  (local.set $i
    (i32.const 0))
  (loop $copy
    (i32.store
      (i32.add
        (local.get $to)
        (i32.mul
          (local.get $i)
          (i32.const 4)))
      (i32.load
        (i32.add
          (local.get $from)
          (i32.mul
            (local.get $i)
            (i32.const 4)))))
    (br_if $copy
      (i32.lt_u
        (local.tee $i
          (i32.add
            (local.get $i)
            (i32.const 1)))
        (local.get $len)))))
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
  (call $obj_val
    (call $new_string
      (local.get $ptr))))
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
  (call $obj_val
    (call $new_string
      (local.get $ptr))))
`;
