
var fs = require('fs')
var util = require('util')
var path = require('path')
var bluebird = require('bluebird')
var es = require('event-stream')

var scriptDir = __dirname
var baseDir = path.resolve(scriptDir, '..') 
var simDataDir = path.resolve(baseDir, 'original_simulation_data')

var resultsDataDir = path.resolve(baseDir, 'simulation_data')

bluebird.promisifyAll(fs)

function processSimulationFiles(done) {
    fs.readdirAsync(simDataDir).then(function(files) {
       
        // collect names of simulations
        var simulationNames = files.filter(function(filename) {
            return /.*_euler_res_fullpermtrack\.txt$/.test(filename)
        }).map(function(filename) {
            return filename.replace('_euler_res_fullpermtrack.txt', '')
        })

        console.log('Found simulations:')
        console.log(simulationNames)

        // collect all processed results together in a dict:
        // key: filename
        // value: processed file
        return bluebird.reduce(
            simulationNames, 
            function(processedSimulations, simulationName) {
                return processSimulationDataAsync(simulationName).then(function(processedSimulation) {
                    processedSimulations[simulationName] = processedSimulation
                    return processedSimulations
                })
            }, 
            {})
    })
    .then(function(processedSimulations) {
        done(null, processedSimulations)
    })
    .catch(function(err) {
        done(err)
    })
}

function parseParamValue(line) {
    line = line.trim()
    var result = parseFloat(line)
    if (isNaN(result)) {
        return line
    } else {
        return result
    }
}

function processSimulationDataFile(filePath, done) {

    var result = {}
    var timeValue = null

    console.log('Processing data file: ' + filePath)

    fs.createReadStream(filePath, { encoding: 'utf-8', flags: 'r' })
        .pipe(es.split())
        .pipe(es.map(function (line, cb) {
            
            line = line.trim()

            if (/^\*\*\*/.test(line)) {
                timeValue = null
            } else if (timeValue === null) {
                timeValue = parseParamValue(line)
                result[timeValue] = []
            } else {
                result[timeValue].push(parseParamValue(line))
            }

            // proceed to next line
            cb()

        }))
        .pipe(es.wait(function(err) {
            if (err) {
                return done(err)
            }

            console.log('file processed: ' + filePath)
            done(null, result)
        }))

}
var processSimulationDataFileAsync = bluebird.promisify(processSimulationDataFile)

function processSimulationData(simulationName, done) {

    console.log('Processing simulation: ' + simulationName)

    fs.readdirAsync(simDataDir).then(function(files) {
        return files.filter(function(filename) {
            return /track\.txt$/.test(filename)
        })
        .filter(function(filename) {
            return ( filename.indexOf(simulationName) !== -1 )
        })
        .map(function(filename) {
            return filename.replace(/.*euler_res_full/, '').replace(/track\.txt/, '') 
        })
    })
    .then(function(varNames) {
        
        var props = varNames.reduce(function(props, varName) {
            var simVarFileName = simulationName + '_euler_res_full' + varName + 'track.txt'
            var simVarFilePath = path.resolve(simDataDir, simVarFileName)

            props[varName] = processSimulationDataFileAsync(simVarFilePath)
            return props

        }, { name: simulationName })

        return bluebird.props(props)
        
    })
    .then(function(result) {
        var outFilePath = path.resolve(resultsDataDir, result.name + '.json')
        console.log('Writing output file: ' + outFilePath)
        fs.writeFile(
            outFilePath,
            JSON.stringify(result, null, 2),
            function(err) {
                done(err, result)
            })
    })
    .catch(function(err) {
        done(err)
    })

}
var processSimulationDataAsync = bluebird.promisify(processSimulationData)

if (require.main === module) {

    processSimulationFiles(function(err, results) {
        if (err) {
            console.log('ERROR: ' + err)
        }
        console.log(util.inspect(results, { depth: 4, colors: true, maxArrayLength: 10 }))
        console.log('done');
    })

}
