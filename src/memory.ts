/**     __      ___  __   ___  ___              __                                   __   __ 
* |\ | /  \    |__  |__) |__  |__              /  \ |\ | |    \ /     /\  |    |    /  \ /  `
* | \| \__/    |    |  \ |___ |___             \__/ | \| |___  |     /~~\ |___ |___ \__/ \__,
*                           ..                               .~7?Y55Y?~.          
* .               ^^.  ~?Y55PPP5?. ..                ^55Y!.~YP5YJ???JPB#! ^!!     
* G^            ^G5?J~7?!^:...:!P?:!J?              ?&Y:^7~!^.        .7!.~:5J    
* ~G7         :5#J  .:          ..   J:           7##7                 :.   .?.   
*  .5Y      .Y#Y:   ?#?    ^?5^:Y.              !B#?.    JP:       ~! !5          
*    JP^   .#P:   .? 7?    7J! ^G              5@J.    ~~:G#!    :PB^ J5          
*     ~P7  .#5^~7!?Y~&?     ?B~ G^             B#.  :. G~!#G:    ~PG? ~#.         
*      .YY  :JYYJP@^.~.     :^. YJ    ..       ^GBGGBBGB 7P!      ~P?  B7         
*        J5      GJ             7P   :5:         :^: !@!               55     7^  
* ^       ?5.   P5             !JB^ !P~             :#Y                ?B    JP   
* J?.      JP: ~@!  .::     ^7G@P75YPJ:             BP               ^YY#! ^PP.   
*  !5!   .7#&7!PYB!!&&?.^!?PG#@P^    :J7           !@?   ...      .~Y&@5!G5PP7.   
*   .JY!YG##? P5 ^Y5BGP##BGPPY^        ^          JGP&! J##Y  .^!5BB@@P^ ..  !5!  
*     :JG&J^  ^PP?!~!JGGB55^.                    .@7 ?BGB@#J5GBGGPPBP~        .7. 
*       :!      ^7?5Y7:^5J~                       GB~  :~!?P@@BBPY?^              
*                  57   ..                        .JGGP5Y5PP7B7P!                 
*                  B!                                .^~P~:  ?J?                  
*                 .#!                                   ^                         
*/
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
(func $realloc
  (param $old i32)
  (param $size i32)
  (result i32)
  (local $new i32)
  (local.set $new
    (call $alloc
      (local.get $size)))
  (call $mem_copy
    (local.get $old)
    (local.get $new)
    (call $get_len
      (local.get $old)))
  ;; todo: mark old as freed
  (local.get $new))
(func $get_len
  (param $pointer i32)
  (result i32)
  (i32.load
    (i32.sub
      (local.get $pointer)
      (i32.const 4)))) ;; len stored before ptr
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
`;
