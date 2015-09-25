var gl;

var TRIANGLE_DIVISION = new TriangleAttribute(6.0);
var TRIANGLE_ANGLE = new TriangleAttribute(0.0);
var TRIANGLE_DEPTH = new TriangleAttribute(1.0);
var TRANSLATION_MATRIX = new TriangleAttribute([0.0, 0.0]);
var TRIANGLE_LIGHT_POINT = new TriangleAttribute(vec2(0.0, 0.0));
var TRIANGLE_DRAW_FULL = new TriangleAttribute(true);
var TRIANGLE_AUTOROTATE = new TriangleAttribute(true);
 

var shaderPrograms;
var canvas;
var keysPressed = []; 

var mouse = {
	lastX : 0,
	lastY : 0,

	x : 0,
	y : 0,

	transX : null,
	transY : null,

	rad2deg : 180.0 / Math.PI,

	calcRefTrans : function(canvas) {
		mouse.transX = canvas.width / 2
		mouse.transY = canvas.height / 2
	},

	update : function() {
		mouse.lastX = mouse.x
		mouse.lastY = mouse.y

		mouse.x = event.offsetX - mouse.transX
		mouse.y = event.offsetY - mouse.transY

	},

	getAngle : function(){
		if(mouse.lastX == 0 || mouse.lastY == 0
			|| mouse.x == 0 || mouse.y == 0
			|| (mouse.x == mouse.lastX && mouse.y == mouse.lastY))
			return 0;

		var u = vec3(mouse.lastX, mouse.lastY, 0.0)
		var s = vec3(mouse.x, mouse.y, 0.0)

		normalize(u); normalize(s);

		var angle = Math.acos( dot(u, s) );
		angle = cross(u, s)[2] < 0 ? angle : -angle

		return angle * mouse.rad2deg
	},

	isDown : false
}

window.onload = function init() {
	canvas = document.getElementById("gl-canvas");
	mouse.calcRefTrans(canvas)

	canvas.addEventListener('mousemove', function(evt) {
		mouse.update();
		
		TRIANGLE_LIGHT_POINT.set(vec2(mouse.x, mouse.y));

		if(mouse.isDown){
			TRIANGLE_ANGLE.set(TRIANGLE_ANGLE.get() + mouse.getAngle() * 0.1)

			MAX_ANGLE = TRIANGLE_ANGLE.get();
			MIN_ANGLE = -TRIANGLE_ANGLE.get();
			CURRENT_ANGLE_SLERP_DELTA_TIME = TOTAL_ANGLE_SLERP_DELTA_TIME;
		}

	}, false);

	canvas.addEventListener("mousedown", function(evt){
		mouse.isDown = true;
	}, false)

	canvas.addEventListener("mouseup", function(evt){
		mouse.isDown = false;
	}, false)

	canvas.addEventListener("mousewheel", function(e) {
		var mouseWheel = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
		var newDepth = TRIANGLE_DEPTH.get() + mouseWheel/10.0;
		if (newDepth > 0 && newDepth < 15.0) {
				TRIANGLE_DEPTH.set(newDepth);
		}
	}, false);

	document.addEventListener("keydown", function(e) {
		var keycode = e.keyCode;
		
		if ((keycode >= 49) && (keycode <= 55)){ //numbers 1-7
			TRIANGLE_DIVISION.set(keycode - 48);
		} else if (keycode == 13) { //enter
			TRIANGLE_DRAW_FULL.set(!TRIANGLE_DRAW_FULL.get());
		} else if (keycode == 32) { //autorotate
			TRIANGLE_AUTOROTATE.set(!TRIANGLE_AUTOROTATE.get());
		}

		keysPressed[keycode] = true;
	}, false);

	document.addEventListener("keyup", function(e) {
		var keycode = e.keyCode;

		keysPressed[keycode] = false;
	}, false);

	gl = WebGLUtils.setupWebGL(canvas);
	if(!gl) { alert("WebGL isn't available"); }
	
	// Configure WebGL
	gl.viewport(0,0,canvas.width, canvas.height);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	
	// Load shaders and initialize attribute buffers
	shaderPrograms = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(shaderPrograms);

	updateTriangle();
	//updateTriangle();
}

function updateTriangle(){
	updateTranslationMatrix();

	if(TRIANGLE_AUTOROTATE.get() && !mouse.isDown) {
		calculateAngleValue()
	}

	if(!TRIANGLE_DIVISION.isLoaded()) {setTriangleDivision()};
	if(!TRIANGLE_ANGLE.isLoaded()) {setTriangleDistortion()};
	if(!TRANSLATION_MATRIX.isLoaded()) {setTriangleTranslation()};
	if(!TRIANGLE_DEPTH.isLoaded()) {setTriangleDepth()};
	if(!TRIANGLE_LIGHT_POINT.isLoaded()) {setTriangleLight()};
	render();
	requestAnimFrame(updateTriangle); 
}

function setTriangleDivision(){
	
	//console.log("DIVISION");

	var vertices = [
	vec2(-0.5,-0.5),
	vec2(0,0.5),
	vec2(0.5,-0.5)];

	vertices = subdivideTriagleNTimes(vertices, TRIANGLE_DIVISION.load());

	// Load the data into the GPU
	var bufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

	// Associate our shader variables with our data buffer
	var vPosition = gl.getAttribLocation(shaderPrograms, "vPosition");
	gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vPosition);
}

function setTriangleDistortion(){
	//console.log("DISTORTION");
	var angleId = gl.getUniformLocation(shaderPrograms, "angle");
	gl.uniform1f(angleId, TRIANGLE_ANGLE.load());
}

function setTriangleDepth() {
	//console.log("DEPTH");
	var depthId = gl.getUniformLocation(shaderPrograms, "depth");
	gl.uniform1f(depthId, TRIANGLE_DEPTH.load());
}

function setTriangleLight(){
	//console.log("LIGHT");
	var lightId = gl.getUniformLocation(shaderPrograms, "vLightPoint");
	gl.uniform2f(lightId, TRIANGLE_LIGHT_POINT.load()[0], TRIANGLE_LIGHT_POINT.load()[1]);
}

function updateTranslationMatrix() {
	var x = TRANSLATION_MATRIX.get()[0];
	var y = TRANSLATION_MATRIX.get()[1];

	if (keysPressed[38]) { //up
		TRANSLATION_MATRIX.set([x, clamp(y + 0.01, -1.5, 1.5)]);
	} else if (keysPressed[40]) { //down
		TRANSLATION_MATRIX.set([x, clamp(y - 0.01, -1.5, 1.5)]);
	} else if (keysPressed[39]) { //right 
		TRANSLATION_MATRIX.set([clamp(x + 0.01, -1.5, 1.5), y]);
	} else if (keysPressed[37]) { //left
		TRANSLATION_MATRIX.set([clamp(x - 0.01, -1.5, 1.5), y]);
	}
	
}

function setTriangleTranslation() {
	//console.log("TRANSLATION")
	var translationId = gl.getUniformLocation(shaderPrograms, "vTranslation");
	gl.uniform2f(translationId, TRANSLATION_MATRIX.load()[0], TRANSLATION_MATRIX.load()[1]);
}

function render() {
	gl.clear(gl.COLOR_BUFFER_BIT);
	var s = 0;
	var e = 3 * Math.pow(4, TRIANGLE_DIVISION.get());
	for (var i = s; i < e; i += 3) {	
		var drawType = null;
		if (TRIANGLE_DRAW_FULL.get()) {
			drawType = gl.TRIANGLES;
		} else {
			drawType = gl.LINE_LOOP;
		}

		gl.drawArrays(drawType, i, 3); 
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

var MIN_ANGLE = - 30.0;
var MAX_ANGLE = 30.0;
var CURRENT_ANGLE_SLERP_DELTA_TIME = 0.0;
var TOTAL_ANGLE_SLERP_DELTA_TIME = 0.2;
var CUT_1 = TOTAL_ANGLE_SLERP_DELTA_TIME;
var CUT_2 = 2*TOTAL_ANGLE_SLERP_DELTA_TIME;
function calculateAngleValue() {
	var triangleAngle = TRIANGLE_ANGLE.get();


	triangleAngle = slerp(MIN_ANGLE, MAX_ANGLE, TOTAL_ANGLE_SLERP_DELTA_TIME, CURRENT_ANGLE_SLERP_DELTA_TIME);
	CURRENT_ANGLE_SLERP_DELTA_TIME += 0.001;
	TRIANGLE_ANGLE.set(triangleAngle);
}

function clamp(number, min, max) {
	return Math.max(min, Math.min(number, max));
}

function slerp(init, end, millis, current) {
	var result = current == 0 ? init : clamp(((-Math.cos(current / Math.PI * 10 / millis) + 1) * 0.5) * (end - init) + init, init, end);
	//console.log(result);
	console.log(millis + " " + current)
	console.log((-Math.cos(current / Math.PI * 10 / millis) + 1) * 50)
	return result;
}

function TriangleAttribute(value) {
	this.value = value;
	this.loaded = false;
}

TriangleAttribute.prototype.set = function(value) {
	this.value = value;
	this.loaded = false;
}

TriangleAttribute.prototype.get = function() {
	return this.value;
}

TriangleAttribute.prototype.load = function() {
	this.loaded = true;
	return this.value;
}

TriangleAttribute.prototype.isLoaded = function(loaded) {
	return this.loaded;
}
