import chunk from './chunk';
import { indent } from './common';
import compiler from './compiler';
import debug from './debug';
import main from './main';
import memory from './memory';
import object from './object';
import scanner from './scanner';
import stack from './stack';
import table from './table';
import util from './util';
import value from './value';
import vm from './vm';

export default `;;wasm
(module
  (import "env" "memory"
    (memory 1))
${indent(
  `
${util} ;; imports must occur before all non-import definitions
${memory}
${chunk}
${value}
${debug}
${scanner}
${object}
${compiler}
${stack}
${table}
${vm}
${main}
`,
  2,
)}
  (export "main"
    (func $main)))
`.replace(/\s*;;wasm/g, '');
