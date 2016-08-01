
require('es6-promise').polyfill();
require('isomorphic-fetch');

const Promise = require('bluebird');

export const Simulations = {
    'simple': {
        input: '../input_data/inputp3d204_1633.json',
        results: '../simulation_data/204_1633_18542.json'
    },
    'complex_1': {
        input: '../input_data/inputp3d204_161.json',
        results: '../simulation_data/204_161_18542.json'
    },
    'complex_2': {
        input: '../input_data/inputp3d204_161.json',
        results: '../simulation_data/204_161_18552.json'
    }
}

var cache = {};

function SimulationDataApi() {}

Object.assign(SimulationDataApi.prototype, {
    fetchSimulation(name) {

        function checkStatus(response) {
          if (response.status >= 200 && response.status < 300) {
            return response
          } else {
            var error = new Error(response.statusText)
            error.response = response
            throw error
          }
        }

        function parseJSON(response) {
          return response.json()
        }

        if (!this.isValidSimulationName(name)){
            return Promise.reject(new Error('invalid simulation name: ' + name));
        }

        if (name in cache) {
            return Promise.resolve(cache[name]);
        }

        var files = Simulations[name];

        return Promise.props({
            name: name,
            files: files,
            input: fetch(files.input)
                .then(checkStatus).then(parseJSON),
            results: fetch(files.results)
                .then(checkStatus).then(parseJSON)
        }).then(function(data) {
            data.varNames = Object.keys(data.results)
                .filter(function(key) {
                    return key !== 'name';
                });

            cache[name] = data;

            return data;
        });

    },

    isValidSimulationName(name) {
       return (name in Simulations);
    },

    getSimulationNames() {
        return Object.keys(Simulations);
    }

});

export default SimulationDataApi;

