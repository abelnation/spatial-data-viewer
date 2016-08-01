
var Redux = require('redux');

var Actions = require('../actions');

var initialState = {
    simulationsByName: {}
};

function selection(state, action) {
    if (!state) {
        return {};
    }

    switch(action.type) {
        case Actions.Types.SET_SIMULATION:
            return Object.assign({}, state, {
                name: action.name,
                varName: null
            });

        case Actions.Types.SET_SIMULATION_VAR:
            return Object.assign({}, state, {
                varName: action.name
            })

        default:
            return state;
    }
}

function status(state, action) {
    if (!state) {
        return {};
    }

    switch(action.type) {
        default:
            return state;
    }
}

function simulationData(state, action) {
    if (!state) {
        state = {
            isFetching: false,
            isProcessing: false
        };
    }

    switch(action.type) {
        case Actions.Types.SIMULATION_REQUEST:
            return Object.assign({}, state, {
                isFetching: true
            });

        case Actions.Types.SIMULATION_REQUEST_SUCCESS:
            return Object.assign({}, state, {
                isFetching: false,
                data: action.data
            });

        case Actions.Types.SIMULATION_REQUEST_FAILURE:
            return Object.assign({}, state, {
                isFetching: false
            });

        case Actions.Types.PROCESS_DATA_START:
            return Object.assign({}, state, {
                isProcessing: true
            });

        case Actions.Types.PROCESS_DATA_FINISH:
            return Object.assign({}, state, {
                isProcessing: false,
                processedData: action.processedData
            });

        case Actions.Types.PROCESS_DATA_ERROR:
            return Object.assign({}, state, {
                isProcessing: false,
                error: action.error
            });

        default:
            return state;
    }
}

function simulationsByName(state, action) {
    if (!state) {
        state = {};
    }

    switch(action.type) {
        case Actions.Types.SIMULATION_REQUEST:
        case Actions.Types.SIMULATION_REQUEST_SUCCESS:
        case Actions.Types.SIMULATION_REQUEST_FAILURE:
        case Actions.Types.PROCESS_DATA_START:
        case Actions.Types.PROCESS_DATA_FINISH:
        case Actions.Types.PROCESS_DATA_ERROR:
            return Object.assign({}, state, {
                [action.name]: simulationData(state[action.name], action)
            });

        default:
            return state;
    }
}

const RootReducer = Redux.combineReducers({
    selection,
    status,
    simulationsByName
});
export default RootReducer;
