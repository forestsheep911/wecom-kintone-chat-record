const { resolve } = require('path')
const isDev = process.env.NODE_ENV !== 'production'
const webpack = require('webpack')

const source = resolve(__dirname, '../src')
const output = resolve(__dirname, '../dist')

module.exports = {
  entry: {
    app: resolve(source, 'index.js'),
  },
  output: {
    filename: `js/[name]${isDev ? '' : '.[contenthash:8]'}.js`,
    path: output,
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  externals: {
  },
  plugins: [
    new webpack.DefinePlugin({
      process: {
        env: {},
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        options: { cacheDirectory: true },
        exclude: /node_modules/,
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
        type: 'asset/inline',
      },
      {
        test: /\.(ttf|woff|woff2|eot|otf)$/,
        type: 'asset/inline',
      },
    ],
  },
}
