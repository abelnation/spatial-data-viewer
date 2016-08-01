
var path = require('path');

module.exports = {
    context: __dirname,
    entry: './main.js',
    output: {
        path: __dirname + '/dist',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            {
                test: /.*\.js$/,
                loader: 'babel-loader',
                exclude: /(dist|node_modules|bower_components)/,
                query: {
                    presets: ['es2015']
                }
            }
        ],
    },

    devtool: 'source-map',
    devServer: {
        contentBase: '.'
    }
};
