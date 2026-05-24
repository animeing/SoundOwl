const path = require('path');
const fs = require('fs');
const { DefinePlugin } = require('webpack');
const { VueLoaderPlugin } = require('vue-loader');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

function safePackageVersion(packageName) {
  try {
    return require(`${packageName}/package.json`).version;
  } catch (_error) {
    return 'unknown';
  }
}

function readGitInfo() {
  const root = path.resolve(__dirname, '..');
  const gitDir = path.join(root, '.git');
  try {
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) {
      return { branch: 'detached', commit: head.slice(0, 12) };
    }
    const ref = head.slice(5);
    const refPath = path.join(gitDir, ref);
    let commit = '';
    if (fs.existsSync(refPath)) {
      commit = fs.readFileSync(refPath, 'utf8').trim();
    } else {
      const packedRefs = fs.readFileSync(path.join(gitDir, 'packed-refs'), 'utf8');
      const line = packedRefs.split(/\r?\n/).find(row => row.endsWith(` ${ref}`));
      commit = line ? line.split(' ')[0] : '';
    }
    return {
      branch: ref.replace(/^refs\/heads\//, ''),
      commit: commit ? commit.slice(0, 12) : 'unknown'
    };
  } catch (_error) {
    return { branch: 'unknown', commit: 'unknown' };
  }
}

const gitInfo = readGitInfo();
const buildInfo = {
  branch: process.env.SOUNDOWL_BRANCH || gitInfo.branch,
  commit: process.env.SOUNDOWL_COMMIT || gitInfo.commit,
  builtAt: new Date().toISOString(),
  node: process.version,
  webpack: safePackageVersion('webpack'),
  vue: safePackageVersion('vue'),
  vuetify: safePackageVersion('vuetify')
};

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
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      __SOUNDOWL_BUILD_INFO__: JSON.stringify(buildInfo)
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
