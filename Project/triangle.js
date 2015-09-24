var gl;

var TRIANGLE_DIVISION = 5.0;
var TRIANGLE_ANGLE = 0.0;
var NEW_TRIANGLE_DIVISION_VALUE = true;
var NEW_TRIANGLE_ANGLE_VALUE = false;

var SUM_ANGLE = true;

var shaderPrograms;

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) { alert("WebGL isn't available"); }
    
    // Configure WebGL
    gl.viewport(0,0,canvas.width, canvas.height);
    gl.clearColor(0.0, 1.0, 1.0, 1.0);
    
    // Load shaders and initialize attribute buffers
    shaderPrograms = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(shaderPrograms);

    setInterval(updateTriangle, 1);
}

function updateTriangle(){
    calculateAngleValue()

    if(NEW_TRIANGLE_DIVISION_VALUE) { 
        setTriangleDivision(TRIANGLE_DIVISION);
        NEW_TRIANGLE_DIVISION_VALUE = false;
    }
    if(NEW_TRIANGLE_ANGLE_VALUE) {
        setTriangleDistorcion(TRIANGLE_ANGLE);
        NEW_TRIANGLE_ANGLE_VALUE = false;
    }
    render();
}

function updateDivisionValue(times) {
    NEW_TRIANGLE_DIVISION_VALUE = true;
    TRIANGLE_DIVISION = times;
}

function updateAngleValue(angle) {
    NEW_TRIANGLE_ANGLE_VALUE = true;
    TRIANGLE_ANGLE = angle;
}

function setTriangleDivision(){

    // Three vertices
    var vertices = [
        vec2(-0.5,-0.5),
        vec2(0,0.5),
        vec2(0.5,-0.5)
    ];
    
    vertices = subdivideTriagleNTimes(vertices, TRIANGLE_DIVISION);

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(shaderPrograms, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
}

function setTriangleDistorcion(){
    var angleId = gl.getUniformLocation(shaderPrograms, "angle");
    gl.uniform1f(angleId, TRIANGLE_ANGLE);
}

function render(divisionTimes) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    var s = 0;
    var e = 3 * Math.pow(4, TRIANGLE_DIVISION);
    for (var i = s; i < e; i += 3) {
        gl.drawArrays(gl.LINE_LOOP, i, 3);    
    }
}

function subdivideTriagleNTimes(vList, times){
    for(var i = 0; i < times; i++){
        vList = subdivideTriangleList(vList)
    }
    return vList;
}

function subdivideTriangleList(vList){
    var out = [];
    for(var i = 0; i < vList.length; i += 3){
        out = out.concat(subdivideTriangle(vList[i], vList[i+1], vList[i+2]));
    }
    return out;
}

function subdivideTriangle(v1, v2, v3) {
    var v1v2 = mix(v1, v2, 0.5); 
    var v1v3 = mix(v1, v3, 0.5);
    var v2v3 = mix(v2, v3, 0.5);
    var out = [v1, v1v2, v1v3,   //1st triangle
               v1v2, v2, v2v3,   //2nd triangle
               v1v3, v2v3, v3,   //3rd triangle
               v1v2, v2v3, v1v3];//4th triangle (inner triangle)
    return out;
}

function calculateAngleValue() {
    if (SUM_ANGLE) {
        updateAngleValue(TRIANGLE_ANGLE + 0.02);
        if (TRIANGLE_ANGLE > 30.0) {
            SUM_ANGLE = false;
        }
    } else {
        updateAngleValue(TRIANGLE_ANGLE - 0.02);
        if (TRIANGLE_ANGLE < -30.0) {
            SUM_ANGLE = true;
        }
    }
}