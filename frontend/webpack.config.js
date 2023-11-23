const path = require('path');
const { DefinePlugin } = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  cache: false,
  mode: 'development',
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js' // 'vue.esm-bundler.js' for Vue 3
    },
    symlinks: false
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
      }
    ]
  },
  entry: [
    './src/main.js'
  ],
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, '../js'),
  },
  plugins:[
    new DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
    }),
    new VueLoaderPlugin()
  ]
};
