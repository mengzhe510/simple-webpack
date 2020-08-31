// !读取webpack的配置
const options = require('./webpack.config.js')
const Webpack = require('./lib/webpack-test-1.js');
new Webpack(options).run()