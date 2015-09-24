var gl;

var TRIANGLE_DIVISION = 6.0;
var TRIANGLE_ANGLE = 0.0;
var TRIANGLE_DEPTH = 1.0;
var TRANSLATION_MATRIX = [0.0, 0.0];
var TRIANGLE_LIGHT_POINT = vec2(0.0, 0.0);
var TRIANGLE_DRAW_FULL = true;
var TRIANGLE_AUTOROTATE = true;


var shaderPrograms;
var canvas;

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	canvas.addEventListener('mousemove', function(evt) {
		var rect = canvas.getBoundingClientRect();
		var mousePos = {x: evt.clientX - rect.left, y: evt.clientY - rect.top};
		TRIANGLE_LIGHT_POINT = vec2(mousePos.x, mousePos.y);
	}, false);

	canvas.addEventListener("mousewheel", function(e) {
		var mouseWheel = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
		var newDepth = TRIANGLE_DEPTH + mouseWheel/10.0;
		if (newDepth > 0 && newDepth < 15.0) {
				TRIANGLE_DEPTH = newDepth;
		}
	}, false);

	document.addEventListener("keydown", function(e) {
		var keycode = e.keyCode;
		var x = TRANSLATION_MATRIX[0];
		var y = TRANSLATION_MATRIX[1];
		if(keycode == 38) { //up
				y += 0.01;
		} else if (keycode == 40) { //down
				y -= 0.01;
		} else if (keycode == 37) { //left 
				x += 0.01;
		} else if (keycode == 39) { //right
				x -= 0.01;
		} else if ((keycode >= 49) && (keycode <= 55)){ //numbers 1-7
				TRIANGLE_DIVISION = keycode - 48;
		} else if (keycode == 13) { //enter
				TRIANGLE_DRAW_FULL = !TRIANGLE_DRAW_FULL;
		} else if (keycode == 32) { //autorotate
				TRIANGLE_AUTOROTATE = !TRIANGLE_AUTOROTATE;
		} else {
				console.log(keycode);
		}
		TRANSLATION_MATRIX[0] = clamp(x, -1.5, 1.5)
		TRANSLATION_MATRIX[1] = clamp(y, -1.5, 1.5)
	}, false);

	gl = WebGLUtils.setupWebGL(canvas);
	if(!gl) { alert("WebGL isn't available"); }
	
	// Configure WebGL
	gl.viewport(0,0,canvas.width, canvas.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	
	// Load shaders and initialize attribute buffers
	shaderPrograms = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(shaderPrograms);

	setInterval(updateTriangle, 1);
	//updateTriangle();
}

function updateTriangle(){
	if(TRIANGLE_AUTOROTATE) {
			calculateAngleValue()
	}

	setTriangleDivision();
	setTriangleDistorsion();
	setTriangleTranslation();
	setTriangleDepth();
	setTriangleLight();
	render();
}

function setTriangleDivision(){
		
	var vertices = [
	vec2(-0.5,-0.5),
	vec2(0,0.5),
	vec2(0.5,-0.5)];

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

function setTriangleDistorsion(){
	var angleId = gl.getUniformLocation(shaderPrograms, "angle");
	gl.uniform1f(angleId, TRIANGLE_ANGLE);
}

function setTriangleDepth() {
	var depthId = gl.getUniformLocation(shaderPrograms, "depth");
	gl.uniform1f(depthId, TRIANGLE_DEPTH);
}

function setTriangleLight(){
	var lightId = gl.getUniformLocation(shaderPrograms, "vLightPoint");
	gl.uniform2f(lightId, TRIANGLE_LIGHT_POINT[0], TRIANGLE_LIGHT_POINT[1]);
}

function setTriangleTranslation() {
	var translationId = gl.getUniformLocation(shaderPrograms, "vTranslation");
	gl.uniform2f(translationId, TRANSLATION_MATRIX[0], TRANSLATION_MATRIX[1]);
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	var s = 0;
	var e = 3 * Math.pow(4, TRIANGLE_DIVISION);
	for (var i = s; i < e; i += 3) {
		//TODO: CHANGE!!!
		if (TRIANGLE_DRAW_FULL) {
			gl.drawArrays(gl.TRIANGLES, i, 3); 
		} else {
			gl.drawArrays(gl.LINE_LOOP, i, 3); 
		}
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

var SUM_ANGLE = true;
function calculateAngleValue() {
	if (SUM_ANGLE) {
		TRIANGLE_ANGLE += 0.02;
		if (TRIANGLE_ANGLE > 30.0) {
				SUM_ANGLE = false;
		}
	} else {
		TRIANGLE_ANGLE -= 0.02;
		if (TRIANGLE_ANGLE < -30.0) {
				SUM_ANGLE = true;
		}
	}
}

function clamp(number, min, max) {
	return Math.max(min, Math.min(number, max));
}

function TriangleAttribute(value) {
	var value = null;
	var loaded = false;
	this.set = function(value) {
		this.value = value;
		this.loaded = false;
	}

	this.get = function() {
		this.loaded = true;
		return this.value;
	}

	this.isLoaded = function(loaded) {
		return this.loaded;
	}
}

