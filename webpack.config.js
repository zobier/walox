const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');

module.exports = {
  entry: ['./src/index.ts'],
  devServer: {
    static: './examples',
  },
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
    new CopyWebpackPlugin({
      patterns: [{ from: 'examples' }],
    }),
    new HtmlWebpackPlugin({
      title: 'walox',
      template: 'index.html',
    }),
    new ProgressPlugin(),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      crypto: false,
      fs: false,
      path: false,
    },
  },
  target: process.env.TARGET,
};
