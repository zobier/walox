const path = require('path');
var ProgressPlugin = require('webpack/lib/ProgressPlugin');

module.exports = {
  entry: './src/index.ts',
  devtool: 'source-map',
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
    new ProgressPlugin()
  ],  
  resolve: {
    extensions: ['.ts', '.js'],
  },
  target: 'node',
};
