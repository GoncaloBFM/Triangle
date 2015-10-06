var gl;

var TRIANGLE_DIVISION = new TriangleAttribute(6.0);
var TRIANGLE_TWIST = new TriangleAttribute(0.0);
var TRIANGLE_ANGLE = new TriangleAttribute(0.0);
var TRIANGLE_DEPTH = new TriangleAttribute(1.0);
var TRIANGLE_DEPTH_STEP = new TriangleAttribute(1.0);
var TRANSLATION_MATRIX = new TriangleAttribute([0.0, 0.0]);
var TRIANGLE_LIGHT_POINT = new TriangleAttribute(vec2(0.0, 0.0));
var TRIANGLE_DRAW_FULL = new TriangleAttribute(true);
var TRIANGLE_AUTOROTATE = new TriangleAttribute(true);

var MIN_ANGLE = - 0.0;
var MAX_ANGLE = 0.0;
var CURRENT_ANGLE_SLERP_DELTA_TIME = 0.0;
var TOTAL_ANGLE_SLERP_DELTA_TIME = 0.2;

var shaderPrograms;
var canvas;
var keysPressed = []; 
var audio;

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

	update : function(event) {
		mouse.lastX = mouse.x
		mouse.lastY = mouse.y

		mouse.x = event.offsetX == undefined ? event.layerX : event.offsetX - mouse.transX
		mouse.y = event.offsetY == undefined ? event.layerY : event.offsetY - mouse.transY

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

	var welcome = document.getElementById("welcome");
	console.log(welcome)
	if (navigator.onLine) {
		welcome.innerText = "Loading God... "+String.fromCharCode(13)+" Please use fullscreen";
	} else {
		welcome.innerText = "Please connect your brick to the Internet";
		return;
	}


	audio = new Audio("https://dl.dropboxusercontent.com/u/23479205/Brian%20Eno%20-%20Complex%20Heaven.mp3");

	audio.oncanplaythrough = function(){
		audio.play();
	}

	audio.addEventListener('ended', function() {
	    this.currentTime = 0;
	    this.play();
	}, false);

	canvas = document.getElementById("gl-canvas");
	canvas.width =  900.0 * (screen.width / 1920.0)
	canvas.height = 700.0 * (screen.height / 1080.0);
	mouse.calcRefTrans(canvas)

	canvas.addEventListener('mousemove', function(evt) {
		mouse.update(evt);
		
		TRIANGLE_LIGHT_POINT.set(vec2(mouse.x, mouse.y));

		if(mouse.isDown){
			TRIANGLE_ANGLE.set(TRIANGLE_ANGLE.value + mouse.getAngle() * 0.1)

			minMax = TRIANGLE_ANGLE.value;
			if (TRIANGLE_ANGLE.value < 0) {
				MAX_ANGLE = -minMax
				MIN_ANGLE = minMax
				CURRENT_ANGLE_SLERP_DELTA_TIME = 0;
			} else {
				MAX_ANGLE = minMax
				MIN_ANGLE = -minMax
				CURRENT_ANGLE_SLERP_DELTA_TIME = TOTAL_ANGLE_SLERP_DELTA_TIME;
			}
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
		var newDepth = TRIANGLE_DEPTH_STEP.value + mouseWheel/10.0;
		if (newDepth > 0 && newDepth < 15.0) {
			TRIANGLE_DEPTH_STEP.set(newDepth);
		}
	}, false);

	document.addEventListener("keydown", function(e) {
		var keycode = e.keyCode;
		if ((keycode >= 48) && (keycode <= 55)){ //numbers 0-7
			var lastDivision = TRIANGLE_DIVISION.value;
			var newDivision = keycode - 48;
			$( "#poem" + lastDivision).fadeOut(200);
			TRIANGLE_DIVISION.set(newDivision);
		} else if (keycode == 13) { //enter
			TRIANGLE_DRAW_FULL.set(!TRIANGLE_DRAW_FULL.value);
		} else if (keycode == 32) { //autorotate
			TRIANGLE_AUTOROTATE.set(!TRIANGLE_AUTOROTATE.value);
		} else if (keycode == 88 || keycode == 80) { //x
			if (audio.paused) {
				audio.play();
			} else {
				audio.pause();
			}
		}

		console.log(keycode);''

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
}

function updateTriangle(){
	updateTranslationMatrix();
	updateTriangleTwist();
	updateTriangleDepth();

	if(TRIANGLE_AUTOROTATE.value && !mouse.isDown) {
		calculateAngleValue()
	}

	if(!TRIANGLE_TWIST.loaded) {setTriangleTwist()};
	if(!TRIANGLE_DIVISION.loaded) {setTriangleDivision()};
	if(!TRIANGLE_ANGLE.loaded) {setTriangleDistortion()};
	if(!TRANSLATION_MATRIX.loaded) {setTriangleTranslation()};
	if(!TRIANGLE_DEPTH.loaded) {setTriangleDepth()};
	if(!TRIANGLE_LIGHT_POINT.loaded) {setTriangleLight()};
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

function setTriangleTwist(){
	//console.log("TWIST");
	var twistId = gl.getUniformLocation(shaderPrograms, "twist");
	gl.uniform1f(twistId, TRIANGLE_TWIST.load());
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
	var x = TRANSLATION_MATRIX.value[0];
	var y = TRANSLATION_MATRIX.value[1];

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

function updateTriangleTwist() {
	var twist = TRIANGLE_TWIST.value;

	if (keysPressed[65] && twist > - 8 * Math.PI) { //a keypress
		TRIANGLE_TWIST.set(twist - 0.1); 
	} else if (keysPressed[68] && twist <= 8 * Math.PI) { //d keypress
		TRIANGLE_TWIST.set(twist + 0.1); 
	}
}

function updateTriangleDepth() {
	step = TRIANGLE_DEPTH_STEP.value;
	depth = TRIANGLE_DEPTH.value;
	if(step - depth < -0.1) {
		TRIANGLE_DEPTH.set(depth -= 0.05)
	} else if(step - depth > 0.1) {
		TRIANGLE_DEPTH.set(depth += 0.05)
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
	var e = 3 * Math.pow(4, TRIANGLE_DIVISION.value);
	for (var i = s; i < e; i += 3) {	
		var drawType = null;
		if (TRIANGLE_DRAW_FULL.value) {
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

function calculateAngleValue() {
	var triangleAngle = TRIANGLE_ANGLE.value;

	triangleAngle = slerp(MIN_ANGLE, MAX_ANGLE, TOTAL_ANGLE_SLERP_DELTA_TIME, CURRENT_ANGLE_SLERP_DELTA_TIME);

	CURRENT_ANGLE_SLERP_DELTA_TIME += 0.0005;

	//if ( CURRENT_ANGLE_SLERP_DELTA_TIME / Math.PI * 10 / TOTAL_ANGLE_SLERP_DELTA_TIME >= 2 * Math.PI)
	//	CURRENT_ANGLE_SLERP_DELTA_TIME -= 2* Math.PI * Math .PI * TOTAL_ANGLE_SLERP_DELTA_TIME / 10;

	TRIANGLE_ANGLE.set(triangleAngle)
}

function clamp(number, min, max) {
	return Math.max(min, Math.min(number, max));
}

function slerp(init, end, millis, current) {
	//var result = current == 0 ? init : clamp(((-Math.cos(current / Math.PI * 10 / millis) + 1) * 0.5) * (end - init) + init, init, end);
	return clamp(((-Math.cos(current / Math.PI * 10 / millis) + 1) * 0.5) * (end - init) + init, init, end);
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
