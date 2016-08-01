
var fs = require('fs')
var util = require('util')
var path = require('path')
var bluebird = require('bluebird')
var es = require('event-stream')

var scriptDir = __dirname
var baseDir = path.resolve(scriptDir, '..') 
var simDataDir = path.resolve(baseDir, 'original_simulation_data')

var inputDataDir = path.resolve(baseDir, 'input_data')

bluebird.promisifyAll(fs)

function processInputFiles(done) {
    fs.readdirAsync(simDataDir).then(function(files) {
        
        var inputFiles = files.filter(function(filename) {
            return /^input.*\.txt/.test(filename)
        })

        // collect all processed results together in a dict:
        // key: filename
        // value: processed file
        return bluebird.reduce(inputFiles, function(processedFiles, filename) {
            return processInputFileAsync(filename).then(function(processedFile) {
                processedFiles[filename] = processedFile
                return processedFiles
            })
        }, {})
    })
    .then(function(processedFiles) {
        done(null, processedFiles)
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

function processInputFile(filename, done) {
    var filePath = path.resolve(simDataDir, filename);
    
    var result = {
        header: {},
        parameters: {},
        data: {}
    }

    var firstLineSeen = false
    var currentState = 'header'

    var curParamName = null
    var curNumRows = null
    var curNumCols = null

    fs.createReadStream(filePath, { encoding: 'utf-8', flags: 'r' })
        .pipe(es.split())
        .pipe(es.map(function (line, cb) {
            
            line = line.trim()
            if (line === '') {
                curParamName = null
                curNumRows = null
                curNumCols = null
                return cb()
            }

            switch(currentState) {


                case 'header':

                    if (!firstLineSeen) {
                        result.header.meta = line
                        firstLineSeen = true
                    } else if (curParamName) {
                        result.header[curParamName] = parseParamValue(line)
                        curParamName = null
                    } else if (/^Settings:/.test(line)) {
                        currentState = 'parameters'
                        curParamName = null
                    } else {
                        curParamName = line
                    }
                    break

                case 'parameters':

                    if (/^\*\*\*/.test(line)) {
                       curParamName = null
                       curNumRows = null
                       curNumCols = null
                       currentState = 'data'
                    } else if (curParamName === null) {
                        curParamName = line 
                    } else {
                        result.parameters[curParamName] = parseParamValue(line)
                        curParamName = null
                    } 
                    break

                case 'data':

                    if (/^\*\*\*/.test(line)) {
                        curParamName = null
                        curNumRows = null
                        curNumCols = null
                    } else if (curParamName === null) {
                        curParamName = line
                        result.data[curParamName] = {
                            name: curParamName,
                            numRows: null,
                            numCols: null,
                            values: []
                        }
                    } else if (curNumRows === null) {
                        curNumRows = parseParamValue(line)
                        result.data[curParamName].numRows = curNumRows
                    } else if (curNumCols === null) {
                        curNumCols = parseParamValue(line)
                        result.data[curParamName].numCols = curNumCols
                    } else {
                        result.data[curParamName].values.push(parseParamValue(line))
                    }
                    break

                default:

                    return cb(new Error('invalid state: ' + currentState))

            }

            // proceed to next line
            cb()

        }))
        .pipe(es.wait(function(err) {
            console.log('file processed: ' + filename)

            var fileContent = JSON.stringify(result, null, 2)

            fs.writeFile(
                path.resolve(inputDataDir, path.basename(filename, '.txt') + '.json'),
                fileContent,
                function(err) {
                    done(err, result)
                })
        }))
}
var processInputFileAsync = bluebird.promisify(processInputFile)

if (require.main === module) {
    processInputFiles(function(err, results) {
        console.log(util.inspect(results, { depth: 4, colors: true, maxArrayLength: 10 }))
        console.log('done');
    })
}
