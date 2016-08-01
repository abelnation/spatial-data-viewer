
var THREE = require('three');
require('./OrbitControls.js'); // ensure OrbitControls are installed

const Actions = require('../actions');
const Colormaps = require('../colormaps').default;

var vertShader = require('raw!../shaders/viz.vert');
var fragShader = require('raw!../shaders/viz.frag');

export default function Visualization(store, domElem) {
    this.domElem = domElem || document.body;
    this.store = store;

    this.simulationName = null;
    this.simulationVariable = null;
    this.data = null;

    this.timeStep = 0;

    this.simulations = {};

    this.init();
}

Object.assign(Visualization.prototype, {
    init() {
        this.initThree();
        this.updateMenu();

        this.unsubscribe = this.store.subscribe(
            this.onStateChanged.bind(this)
        );
    },

    initThree() {
        var viz = this.viz = {}
        var scene = viz.scene = new THREE.Scene();

        var cam = viz.cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
        cam.position.set(200, 200, 200);
        cam.lookAt(new THREE.Vector3(0, 0, 0));
        scene.add(cam);

        var rnd = viz.rnd = new THREE.WebGLRenderer();
        rnd.setSize(window.innerWidth, window.innerHeight);

        var origin = viz.origin = new THREE.Object3D();
        scene.add(origin);

        var axes = viz.axes = new THREE.AxisHelper(100);
        scene.add(axes);

        var orb = viz.orb = new THREE.OrbitControls(cam, rnd.domElement);
        orb.addEventListener('change', this.render.bind(this));
        orb.update();

        var colormap = Colormaps.viridis;
        console.log(colormap);
        var colormapTex = viz.colormapTex = new THREE.DataTexture(
            colormap.array,
            colormap.width, colormap.height,
            THREE.RGBFormat, THREE.UnsignedByteType,
            THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
            THREE.LinearFilter, THREE.LinearFilter,
            1
        );
        colormapTex.needsUpdate = true;

        console.log(colormapTex);

        var mat = viz.mat = new THREE.RawShaderMaterial({
            uniforms: {
                uColormapTex: { value: colormapTex },
            },
            vertexShader: vertShader,
            fragmentShader: fragShader,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5
        });

        this.domElem.appendChild(viz.rnd.domElement);
    },

    updateMenu() {

        var name = this.simulationName;
        var varName = this.simulationVariable;
        var simData = name ? this.simulations[name] : null;

        this.destroyMenu();

        var self = this;
        var gui = this.gui = {};
        var datGui = gui.dat = new dat.GUI();

        datGui.width = 240;

        var gStyle = gui.style = datGui.domElement.style;
        gStyle.position = 'absolute';
        gStyle.top = '0px';
        gStyle.right = '0px';
        gStyle.height = '300px';

        // var varData = this.props.data.vars[this.props.data.defaultVar];

        var gParams = gui.params = {};

        if (name) {
            gParams['simulationName'] = this.simulationName;
            datGui.add(gParams, 'simulationName')
                .onFinishChange(function(newValue) {
                    self.store.dispatch(Actions.setSimulation(newValue));
                })
                .listen();
        }

        if (varName) {
            gParams['simulationName variable'] = this.simulationVariable;
            datGui.add(gParams, 'simulationName variable')
                .onFinishChange(function(newValue) {
                    self.store.dispatch(Actions.setSimulationVariable(newValue));
                })
                .listen();
        }

        if (name && varName && simData && simData.processedData) {

            var simVar = simData.processedData.vars[this.simulationVariable];
            if (simVar) {
                gParams['time'] = this.timeStep;
                datGui.add(gParams, 'time', 0, simVar.numTimeSteps-1)
                    .step(1)
                    .onChange(function(newValue) {
                        self.onTimeStepUpdated(newValue);
                    })
                    //.listen();
            }
        }

        // TODO: hook this up to proper data in simulationName data
        // TODO: dispatch actions in response to menu items changing

        datGui.open();
    },

    initVizDataForSim(sim) {

        // create BufferGeometry
        var vertices = sim.processedData.geometry.vertices;
        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));

        sim.geometry = geometry;

        if (!this.viz.mesh) {
            console.log('initializing mesh');

            console.log(sim);

            this.viz.mesh = new THREE.Mesh(sim.geometry, this.viz.mat);
            this.viz.scene.add(this.viz.mesh);
        }

        // create attributes
        sim.vars = {};
        for (var varName in sim.processedData.vars) {

            var varData = sim.processedData.vars[varName];
            sim.vars[varName] = { bufferAttributes: {} };

            for (var attrName in varData.attributes) {

                var attrData = varData.attributes[attrName];
                var attrLength = varData.attributeLengths[attrName];

                sim.vars[varName].bufferAttributes[attrName] = [];

                for (var i = 0; i < attrData.length; i++) {
                    sim.vars[varName].bufferAttributes[attrName][i] =
                        new THREE.BufferAttribute(attrData[i], attrLength);
                }

            }

        }

        console.log(sim);

    },

    updateSimulationData(simData) {

        // don't add simulation to cache until we get some data
        if (!simData.data) { return; }

        var name = simData.data.name;
        var files = simData.data.files;

        if (!name) {
            console.log("ERROR: no name for simulation");
            return;
        }

        // add entry for simulation if not present
        if ( !this.simulations.hasOwnProperty(name) ) {
            this.simulations[name] = {
                name: name,
                files: files,
                rawData: simData.data
            };
        }

        var sim = this.simulations[name];

        if ( !sim.processedData && simData.processedData ) {
            sim.processedData = simData.processedData;
            this.initVizDataForSim(sim);
        }

    },

    updateVisualization(skipMenuUpdate) {

        var simName = this.simulationName;
        var varName = this.simulationVariable;
        var simTimeStep = this.timeStep;

        var sim = this.simulations[simName];

        if (!skipMenuUpdate) {
            this.updateMenu();
        }

        if (!sim) {
            return;
        }

        if (!sim.processedData) {
            return;
        }

        if ( !sim.processedData.vars.hasOwnProperty(varName) ) {
            console.log("ERROR: invalid varName: " + varName);
            return;
        }

        if ( !sim.vars.hasOwnProperty(varName) ) {
            console.log("WARN: no buffer attr for processed var: " + varName);
            return;
        }

        var bufferAttributes = sim.vars[varName].bufferAttributes;

        this.viz.mesh.geometry = sim.geometry;
        for (var attrBufferName in bufferAttributes) {

            var attrTimeFrameBuffers = bufferAttributes[attrBufferName];
            var bufferAttribute = attrTimeFrameBuffers[simTimeStep];

            sim.geometry.addAttribute(attrBufferName, bufferAttribute);
            bufferAttribute.needsUpdate = true;

        }

        this.render();

    },

    // render

    render() {
        this.viz.rnd.render(this.viz.scene, this.viz.cam);
    },

    // change handlers

    onStateChanged() {

        var state = this.store.getState();

        var stateName = state.selection.name;
        var stateVar = state.selection.varName;
        var stateSimData = stateName in state.simulationsByName ?
            state.simulationsByName[stateName] :
            null;

        // user changed simulationName data set
        if (stateName !== this.simulationName) {
            this.onSimulationChanged(stateName, state);
        }

        // user changed simulationName variable to plot
        if (stateVar !== this.simulationVariable) {
            this.onSimulationVariableChanged(stateVar, state);
        }

        // processed simulationName data arrived
        if (stateSimData !== this.sim) {
            this.onDataReceived(stateSimData, state);
        }
    },

    onSimulationChanged(name, state) {

        this.simulationName = name;
        this.updateMenu();

        this.updateVisualization();

    },

    onSimulationVariableChanged(varName, state) {

        if (!this.simulationName) {
            console.log("WARN: sim var set without simulation name");
            return;
        }

        this.simulationVariable = varName;

        this.updateVisualization();

    },

    onDataReceived(simData) {

        var needsProcessing

        if (!simData) {
            return;
        }

        if (simData && simData.error) {
            console.log('error');
            console.log(simData.error);
            return;
        }

        var needsProcessing = simData
            && simData.data
            && !simData.processedData
            && !simData.isProcessing;

        if (needsProcessing) {
            this.store.dispatch(Actions.processData(this.simulationName));
        }

        this.updateSimulationData(simData);
        this.updateVisualization();

    },

    onTimeStepUpdated(newTimeStep) {

        this.timeStep = newTimeStep;
        this.updateVisualization(true);

    },

    destroyMenu() {
        if (this.gui && this.gui.dat) {
            this.gui.dat.destroy();
            this.gui = null;
        }
    },

    destroy() {
        this.destroyMenu();

        // de-register store listeners
        this.unsubscribe();
    }

});

