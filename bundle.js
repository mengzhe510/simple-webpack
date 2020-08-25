// !读取webpack的配置
const options = require('./webpack.config.js')
const Webpack = require('./lib/webpack.js');
new Webpack(options).run()