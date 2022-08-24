# walox

A WebAssembly port of the C implementation of Lox from 
[https://craftinginterpreters.com/](https://craftinginterpreters.com/)

## Prerequisites

* [Node](https://nodejs.org/en/download/)
* [Yarn](https://yarnpkg.com/getting-started/install)

## Building

```sh
yarn && yarn build
```

## Running

```sh
node dist/main
```

## Dev loop

To watch for changes and execute the module in node

```sh
yarn watch
```

To watch for changes and open a browser with the module loaded

```sh
yarn start
```
