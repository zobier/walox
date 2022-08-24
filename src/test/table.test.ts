import wabt from 'wabt';

import memory from '../memory';
import value from '../value';
import chunk from '../chunk';
import object from '../object';
import table from '../table';
import util, { getString, getUtil } from '../util';

test('table', async () => {
  await wabt()
    .then(async (wabt) => {
      const module = await WebAssembly.compile(
        wabt
          .parseWat(
            'inline',
            `;;wasm
(module
  (import "env" "memory"
    (memory 1))
  ${util} ;; imports must occur before all non-import definitions
  ${memory}
  ${value}
  ${chunk}
  ${object}
  ${table}
  (func 
    (export "test")
    (param $srcptr i32)
    (local $table i32)
    (local $fooptr i32)
    (local $fooptr2 i32)
    (local $barptr i32)
    (local $bazptr i32)
    (local $42ptr i32)
    (call $init_memory
      (i32.add
        (local.get $srcptr)
        (i32.mul
          (call $get_len
            (local.get $srcptr))
          (i32.const 4))))
    (call $init_value_array
      (i32.const 4))
    (local.set $fooptr
      (call $write_value_array
        (call $copy_string
          (i32.const 4)
          (i32.const 3))))
    (local.set $fooptr2
      (call $write_value_array
        (call $copy_string
          (i32.const 4)
          (i32.const 3))))
    (local.set $barptr
      (call $write_value_array
        (call $copy_string
          (i32.const 16)
          (i32.const 3))))
    (local.set $bazptr
      (call $write_value_array
        (call $copy_string
          (i32.const 28)
          (i32.const 3))))
    (local.set $42ptr
      (call $write_value_array
        (f64.const 42)))
    (local.set $table
      (call $init_table))
    (drop
      (call $table_set
        (local.get $table)
        (call $get_value
          (local.get $fooptr))
        (call $get_value
          (local.get $42ptr))))
    (drop
      (call $table_set
        (local.get $table)
        (call $get_value
          (local.get $barptr))
        (call $get_value
          (local.get $bazptr))))
    (call $print_value
      (call $table_get
        (local.get $table)
        (call $get_value
          (local.get $fooptr2))))
    (call $print_value
      (call $table_get
        (local.get $table)
        (call $get_value
          (local.get $barptr))))
    )
  )
`,
          )
          .toBinary({}).buffer,
      );
      const mem = new WebAssembly.Memory({ initial: 1 });
      const utilities = getUtil(mem.buffer);
      const logStringMock = jest.spyOn(utilities, 'logString');
      const logNumMock = jest.spyOn(utilities, 'logNum');
      const importObject = {
        env: {
          memory: mem,
        },
        util: utilities,
      };
      const instance = await WebAssembly.instantiate(module, importObject);
      const memArray = new Uint32Array(mem.buffer);
      const source = Uint32Array.from(
        `foobarbaz`,
        (c) => c.codePointAt(0) || 0,
      );
      memArray.set([source.length]);
      memArray.set(source, 1);
      (instance.exports.test as Function)(4);
      // utilities.hexDump(0, 256);
      expect(getString(mem.buffer, ...logStringMock.mock.calls[0])).toBe('baz');
      expect(logNumMock).toHaveBeenCalledWith(42);
    })
    .catch((e) => {
      console.error(e);
    });
});
