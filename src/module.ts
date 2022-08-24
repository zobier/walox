import chunk from './chunk';
import compiler from './compiler';
import debug from './debug';
import main from './main';
import memory from './memory';
import scanner from './scanner';
import stack from './stack';
import util from './util';
import value from './value';
import vm from './vm';

export default `;;wasm
(module
  (import "env" "memory"
    (memory 1))
  ${util} ;; imports must occur before all non-import definitions
  ${memory}
  ${chunk}
  ${value}
  ${debug}
  ${scanner}
  ${compiler}
  ${stack}
  ${vm}
  ${main}
  (export "main"
    (func $main)))
`.replace(/\s*;;wasm/g, '');
