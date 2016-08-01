
var chroma = require('chroma-js');

function range(min, max) {
    if (typeof max === 'undefined') {
        max = min;
        min = 0;
    }

    return Array.apply(null, { length: max - min }).map(function(_, idx) {
        return min + idx;
    });
}

console.log('range: ');
console.log(range(10));

const colormaps = {}

var viridisStops = ['#440154', '#482777', '#3F4A8A', '#31678E', '#26838F', '#1F9D8A', '#6CCE5A', '#B6DE2B', '#FEE825'];
var viridisScale = chroma.scale(viridisStops);
colormaps.viridis = {
    width: 1048,
    height: 1,
    array: new Uint8Array(
        range(1048).reduce(function(result, i) {
            Array.prototype.push.apply(
                result,
                viridisScale(i / 1048.0).rgb());
            return result;
        }, []).map(Math.round)
    )
};

export default colormaps;
