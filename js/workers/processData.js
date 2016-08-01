
// var worker = new ProcessDataWorker();
// worker.onmessage = function({ data }) {
//
// }
// worker.onerror = function({ message, filename, lineno }) {
//
// }

var THREE = require('three');

// data values
var SIM_MIN_VALUE = 1e-35;
var IGNORE_ALPHA_THRESHOLD = 1e-5;

// geometry
var VERTICES_PER_ELEMENT = 6;
var VALUES_PER_POSITION = 3;

// attributes
var VALUES_PER_ALPHA_ATTR = 1;
var VALUES_PER_VALUE_ATTR = 1;

function DataProcessor(simulationName, data) {
    this.simulationName = simulationName;
    this.data = data;

    this.processedData = {};
}

Object.assign(DataProcessor.prototype, {

    process() {
        this.processedData = {};

        // input data
        this.analyzeInputData();
        this.generateInputGeometry();

        // output variables
        this.determineOutputVariables();
        this.analyzeOutputVariables();

        return this.processedData;
    },

    analyzeInputData() {
        // processed data result
        var pd = this.processedData;

        var input = this.data.input;

        pd.simulationName = this.simulationName;
        pd.numElements = input.data.elmx.numRows;
    },

    generateInputGeometry() {

        var pd = this.processedData;
        var geometry = pd.geometry = {};

        var numElements = pd.numElements;
        var inputData = this.data.input.data;

        var elmx = inputData.elmx,
            elmy = inputData.elmy,
            elmz = inputData.elmz,
            elma = inputData.elma,
            anglemat = inputData.anglemat;

        // rect center
        var p = new THREE.Vector3();
        var t;

        // rect vertices
        var rect = [
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3(),
            new THREE.Vector3()
        ];
        var rectTriangleVertexOrder = [
            0,1,2,
            0,2,3
        ];

        // rect half dim vectors
        var vw = new THREE.Vector3();
        var vh = new THREE.Vector3();
        var vwr = new THREE.Vector3();

        // constant for all rects
        var rectHalfWidth, rectHalfHeight;
        rectHalfHeight = this.data.input.parameters.rectza;

        var vertices = new Float32Array(numElements * VERTICES_PER_ELEMENT * VALUES_PER_POSITION);

        for (var i = 0; i < numElements; i++) {

            rectHalfWidth = elma.values[i];

            // in simulation data, z axis points up.
            // re-arrange data to match the gfx convention of y axis points up
            p.set (elmx.values[i], elmz.values[i], elmy.values[i]);
            vw.set(rectHalfWidth,  0,              0             );
            vh.set(0,              rectHalfHeight, 0             );

            // rotate rect to correspond to anglemat value
            // counter-clockwise rotation around y axis
            // only need to rotate half-width vector
            t = anglemat.values[i];
            vwr.x = vw.x * Math.cos(-t);
            vwr.y = vw.y;
            vwr.z = - vw.x * Math.sin(-t);

            // generate rect vertices by add/sub half vectors from center point
            rect[0].subVectors(p, vwr).sub(vh);
            rect[1].addVectors(p, vwr).sub(vh);
            rect[2].addVectors(p, vwr).add(vh);
            rect[3].subVectors(p, vwr).add(vh);

            // 1, 2, 3, 1, 3, 4
            // convert rect to triangles and insert into vertex buffer array
            var baseOffset = i * VERTICES_PER_ELEMENT * VALUES_PER_POSITION;
            rectTriangleVertexOrder.forEach(function(vertexIdx, i) {
                rect[vertexIdx].toArray(vertices, baseOffset + VALUES_PER_POSITION * i);
            });

        }

        geometry.vertices = vertices;

    },

    determineOutputVariables() {

        var results = this.data.results;
        var pd = this.processedData;

        var varNames = pd.varNames = Object.keys(results).filter(function(key) {
            return key !== 'name'
        });

        pd.defaultVar = varNames[0];

    },

    analyzeOutputVariables() {

        var self = this;
        var pd = this.processedData;
        pd.vars = {};

        pd.varNames.forEach(function(varName) {
            self.analyzeOutputVariable(varName);
            self.generateOutputVariableAttributes(varName);
        });

    },

    analyzeOutputVariable(varName) {

        var rawVarData = this.data.results[varName];
        var pd = this.processedData;

        var result = pd.vars[varName] = {};

        // store both float value and original string
        var timeSteps = Object.keys(rawVarData)
            .map(function(key) {
                return [
                    parseFloat(key, 10),
                    key
                ]
            }).sort(function(a, b) {
                return a[0] - b[0];
            });

        result.numTimeSteps = timeSteps.length;
        result.timeSteps = timeSteps;
        result.timeStepsReverseMapping = timeSteps.reduce(function(prev, timeStepArr) {
            prev[timeStepArr[0]] = timeStepArr[1];
            return prev;
        }, {});

        result.timeStart = timeSteps[0][0];
        result.timeEnd = timeSteps[timeSteps.length - 1][0];

        // gather frames of values into an array of arrays, sorted by time value
        result.frames = timeSteps.map(function(timeStepArr) {
            return rawVarData[timeStepArr[1]];
        });

        // analyze variable for min/max value
        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;
        result.frames.forEach(function(frameValues) {
            frameValues.forEach(function(val) {
                min = Math.min(min, val);
                max = Math.max(max, val);
            });
        });

        result.minValue = min;
        result.maxValue = max;

    },

    generateOutputVariableAttributes(varName) {

        var pd = this.processedData;
        var numElements = pd.numElements;

        var inputData = this.data.input.data;
        var varData = pd.vars[varName];

        var numTimeSteps = varData.numTimeSteps;
        var frames = varData.frames;
        var minValue = varData.minValue;
        var maxValue = varData.maxValue;
        var range = maxValue - minValue;

        var attributes = {
            alpha: [],
            value: []
        };

        // START HERE:
        // attributes and attributeLengths are not
        // getting set with anything on the data

        pd.vars[varName].attributes = attributes;

        var attributeLengths = {
            alpha: VALUES_PER_ALPHA_ATTR,
            value: VALUES_PER_VALUE_ATTR
        };
        pd.vars[varName].attributeLengths = attributeLengths;

        var frame;
        var alphaFrame, valueFrame;
        var alphaBaseOffset, valueBaseOffset;
        var rawAlphaValue, alphaValue, valueValue;
        for (var i = 0; i < numTimeSteps; i++) {

            frame = frames[i]
            alphaFrame = new Float32Array(numElements * VERTICES_PER_ELEMENT * VALUES_PER_ALPHA_ATTR);
            valueFrame = new Float32Array(numElements * VERTICES_PER_ELEMENT * VALUES_PER_VALUE_ATTR);

            frame.forEach(function(frameValue, frameIdx) {

                alphaBaseOffset = frameIdx * VERTICES_PER_ELEMENT * VALUES_PER_ALPHA_ATTR;
                valueBaseOffset = frameIdx * VERTICES_PER_ELEMENT * VALUES_PER_VALUE_ATTR;

                // calc attr value for frame
                valueValue = frameValue;

                // calc alpha value for frame
                rawAlphaValue = (frameValue - minValue) / range;

                if (frameValue < SIM_MIN_VALUE || rawAlphaValue <= IGNORE_ALPHA_THRESHOLD) {
                    alphaValue = 0.0;
                } else {
                    alphaValue = rawAlphaValue;
                }

                // write attr frame values for each vertex for this element
                for (var j = 0; j < VERTICES_PER_ELEMENT; j++) {
                    alphaFrame[alphaBaseOffset + (j * VALUES_PER_ALPHA_ATTR)] = alphaValue;
                    valueFrame[valueBaseOffset + (j * VALUES_PER_VALUE_ATTR)] = valueValue;
                }

            });

            attributes.alpha[i] = alphaFrame;
            attributes.value[i] = valueFrame;

        }

    },

});

onmessage = function(e) {

    var simulationName = e.data.simulationName;
    var data = e.data.data;

    var processedData = new DataProcessor(simulationName, data).process();
    self.postMessage(processedData);
    self.close();

}

