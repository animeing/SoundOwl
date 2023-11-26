const path = require('path');
const { DefinePlugin } = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  cache: false,
  mode: 'development',
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js' // 'vue.esm-bundler.js' for Vue 3
    },
    symlinks: false
  },
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true
  },
  module:{
    rules:[
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options:{
          compilerOptions:{
            isCustomElement: tag => tag.startsWith('sw-')
          }
        }
      },
      {
        test: /\.css$/,
        use:[
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/experimental',
        loader: 'wasm-loader'
      }
    ]
  },
  entry: [
    './src/main.js'
  ],
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, '../js'),
    publicPath:'../js/'
  },
  plugins:[
    new DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    }),
    new VueLoaderPlugin(),
    new CircularDependencyPlugin({
      onDetected({ module: webpackModuleRecord, paths, compilation }) {
        compilation.errors.push(new Error(paths.join(' -> ')));
      },
      exclude: /node_modules/,
      failOnError: true
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm', to: './' },
        { from: 'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js', to:'./'}
      ]
    })
  ]
};
