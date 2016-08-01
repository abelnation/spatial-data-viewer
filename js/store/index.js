
var Redux = require('redux');
var ReduxThunk = require('redux-thunk').default;
var ReduxLogger = require('redux-logger');

var reducer = require('../reducers').default;

const SimulationStore = Redux.createStore(
    reducer,
    Redux.applyMiddleware(
        ReduxThunk, // Allows easier creation dynamic and async actions
        ReduxLogger() // logger must be last middleware in the chain
    )
);

export default SimulationStore;
