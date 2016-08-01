
// see: https://webpack.github.io/docs/configuration.html#output-publicpath
// see: https://medium.com/@aviv.rosental/portable-bundle-with-webpack-d2eed216cd4c#.qjli4nt7h
__webpack_public_path__ = '/js/dist/';

var Actions = require('./actions');
var Store = require('./store').default;
var Visualization = require('./viz/visualization.js').default;

var viz = new Visualization(
    Store,
    document.getElementById('vizualization'));

Store.dispatch(Actions.setSimulation('simple'));
// Store.dispatch(Actions.setSimulation('complex_1'));

