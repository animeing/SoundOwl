const path = require('path');
const { DefinePlugin } = require('webpack');

module.exports = {
    cache: false,
    mode: 'production',
    resolve: {
        alias: {
          'vue$': 'vue/dist/vue.esm-bundler.js' // 'vue.esm-bundler.js' for Vue 3
        },
        symlinks: false
    },
    entry: {
        main: './src/main.js'
    },
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, '../js'),
    },
    plugins:[
        new DefinePlugin({
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false,
        })
    ]
}
