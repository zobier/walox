#!/usr/bin/env node

const path = require('path');
const webpack = require('webpack');

const config = require('../webpack.config.js');

const compiler = webpack({
  ...config,
  devtool: false,
});
compiler.watch(
  {
    poll: 100,
  },
  (err, stats) => {
    if (err) {
      console.error(err);
    }

    const {
      compilation: { assets },
    } = stats;
    Object.keys(assets).map((asset) => {
      if (!asset.endsWith('.html')) {
        const filename = require.resolve(path.join('..', 'dist', asset));
        delete require.cache[filename];
        require(filename);
      }
    });
  },
);
