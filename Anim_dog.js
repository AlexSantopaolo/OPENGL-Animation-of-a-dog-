"use strict";

var canvas;
var gl;
var program;

// Per Vertexshader

var projectionMatrix;
var modelViewMatrix;
var instanceMatrix;
var modelViewMatrixLoc;

// Moving parameter

var displacement=-10;

// Texture

var texSize = 256;
var numChecks = 8;
var texture1, texture2;
var t1, t2;
var c;

//Animations

var boolstop =true;
var boolanimat = true;

// Head parameters


var displacementZ, displacementY;
var lateral= 0;
var longitudinal= 0;
var alpha ;
var lambda;
var x, y, z;

// View matrix

var eye = vec3(0.0,0.0,6.0);
var at = vec3(0.0,0.0,0.0);
var up = vec3(0.0,0.1,0.0);
instanceMatrix = mat4();
modelViewMatrix=lookAt(eye, at, up);

// Application texture 1

var image1 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ ) {
        for ( var j = 0; j <texSize; j++ ) {
            var patchx = Math.floor(i/(texSize/numChecks));
            var patchy = Math.floor(j/(texSize/numChecks));
            if(patchx%2 ^ patchy%2) c = 255;
            else c = 0;
            image1[4*i*texSize+4*j] = c;
            image1[4*i*texSize+4*j+1] = c;
            image1[4*i*texSize+4*j+2] = c;
            image1[4*i*texSize+4*j+3] = 255;
        }
    }

// Application  checkboard texture

var image2 = new Uint8Array(4*texSize*texSize);

    // Create a checkerboard pattern
    for ( var i = 0; i < texSize; i++ ) {
        for ( var j = 0; j <texSize; j++ ) {
            image2[4*i*texSize+4*j] = -255+i;
            image2[4*i*texSize+4*j+1] = -255 +i;
            image2[4*i*texSize+4*j+2] = -255+i;
            image2[4*i*texSize+4*j+3] = 255;
           }
    }

// Arrays


var colorsArray = [];
var texCoordsArray = [];

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

var vertices = [

    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5, -0.5, -0.5, 1.0 )
];

var vertexColors = [
    vec4( 0.0, 0.0, 0.0, 1.0 ),  // black
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // cyan
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
    vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
    vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
    vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
    vec4( 0.0, 1.0, 1.0, 1.0 ),  // white
];

// Configure texture

function configureTexture() {
    texture1 = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture1 );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image1);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    texture2 = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture2 );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image2);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
                      gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

// Hierarchical structure

var torsoId = 0;
var headId  = 1;
var head1Id = 1;
var head2Id = 10;
var leftUpperArmId = 2;
var leftLowerArmId = 3;
var rightUpperArmId = 4;
var rightLowerArmId = 5;
var leftUpperLegId = 6;
var leftLowerLegId = 7;
var rightUpperLegId = 8;
var rightLowerLegId = 9;
var tailId=11;


var torsoWidth = 2.4;
var torsoHeight = 1.0;

var upperArmHeight = 0.9;
var lowerArmHeight = 0.9;

var upperArmWidth  = 0.5;
var lowerArmWidth  = 0.5;

var upperLegWidth  = 0.5;
var lowerLegWidth  = 0.5;

var lowerLegHeight = 0.9;
var upperLegHeight = 0.9;

var headHeight = 0.9;
var headWidth = 0.9;

var tailHeight = 1.3;
var tailWidth = 0.3;

var numNodes = 12;
var numAngles = 12;
var angle = 0;

// Angles for each part

var theta = [-90, 0, -90, 0, -90, 0, -90, 0, -90, 0, 0, 45];


var numVertices = 24;

var stack = [];

var figure = [];

for( var i=0; i<numNodes; i++) figure[i] = createNode(null, null, null, null);

var vBuffer;
var modelViewLoc;
var pointsArray = [];



function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

function createNode(transform, render, sibling, child){
    var node = {
    transform: transform,
    render: render,
    sibling: sibling,
    child: child,
    }
    return node;
}


function initNodes(Id) {

    var m = mat4();

    switch(Id) {

    case torsoId:
	m= translate(displacement,0,0);
    m =mult(m, rotate(theta[torsoId], 0, 0, 1 ));
   	m=mult(m, rotate(theta[torsoId], 0, 1, 0 ));
    figure[torsoId] = createNode( m, torso, null, headId );
    break;

    case headId:
    case head1Id:
    case head2Id:


    m = translate(0.0, torsoWidth, 0.9);
	m = mult(m, rotate(theta[head1Id], 1, 0, 0))
	m = mult(m, rotate(theta[head2Id], 0, 1, 0));
	m = mult(m, rotate(longitudinal, 0,0,1));
	m = mult(m, rotate(lateral, 1,0, 0));

    figure[headId] = createNode( m, head, leftUpperArmId, null);
    break;

    case leftUpperArmId:

    m = translate(-torsoHeight, 0.90*torsoWidth, -0.5);
   	m = mult(m, rotate(theta[leftUpperArmId], 1, 0, 0));
    figure[leftUpperArmId] = createNode( m, leftUpperArm, rightUpperArmId, leftLowerArmId );
    break;

    case rightUpperArmId:

    m = translate(torsoHeight, 0.90*torsoWidth, -0.5);
	  m = mult(m, rotate(theta[rightUpperArmId], 1, 0, 0));
    figure[rightUpperArmId] = createNode( m, rightUpperArm, leftUpperLegId, rightLowerArmId );
    break;

    case leftUpperLegId:

    m = translate(-(torsoHeight), 0.1*torsoWidth, -0.5);
	  m = mult(m , rotate(theta[leftUpperLegId], 1, 0, 0));
    figure[leftUpperLegId] = createNode( m, leftUpperLeg, rightUpperLegId, leftLowerLegId );
    break;

    case rightUpperLegId:

    m = translate(torsoHeight, 0.1*torsoWidth, -0.5);
	  m = mult(m, rotate(theta[rightUpperLegId], 1, 0, 0));
    figure[rightUpperLegId] = createNode( m, rightUpperLeg, tailId, rightLowerLegId );
    break;

    // tail

    case tailId:

    m = translate(0.0, -0.3*torsoWidth, -0.5);
    m = mult(m, rotate(theta[tailId], 1, 0, 0));
    figure[tailId] = createNode( m, tail, null, null);
    break;

    case leftLowerArmId:

    m = translate(0.0, upperArmHeight, 0.0);
    m = mult(m, rotate(theta[leftLowerArmId], 1, 0, 0));
    figure[leftLowerArmId] = createNode( m, leftLowerArm, null, null );
    break;

    case rightLowerArmId:

    m = translate(0.0, upperArmHeight, 0.0);
    m = mult(m, rotate(theta[rightLowerArmId], 1, 0, 0));
    figure[rightLowerArmId] = createNode( m, rightLowerArm, null, null );
    break;

    case leftLowerLegId:

    m = translate(0.0, upperLegHeight, 0.0);
    m = mult(m, rotate(theta[leftLowerLegId], 1, 0, 0));
    figure[leftLowerLegId] = createNode( m, leftLowerLeg, null, null );
    break;

    case rightLowerLegId:

    m = translate(0.0, upperLegHeight, 0.0);
    m = mult(m, rotate(theta[rightLowerLegId], 1, 0, 0));
    figure[rightLowerLegId] = createNode( m, rightLowerLeg, null, null );
    break;

    }

}

function traverse(Id) {

   if(Id == null) return;
   stack.push(modelViewMatrix);
   modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
   figure[Id].render();
   if(figure[Id].child != null) traverse(figure[Id].child);
    modelViewMatrix = stack.pop();
   if(figure[Id].sibling != null) traverse(figure[Id].sibling);
}

function torso() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5*torsoWidth, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4( torsoHeight, torsoWidth, torsoHeight));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );;
}

function head() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0 ));
	instanceMatrix = mult(instanceMatrix, scale4(headWidth, headHeight, headWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function tail() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * tailHeight, 0.0 ));
	instanceMatrix = mult(instanceMatrix, scale4(tailWidth, tailHeight, tailWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function leftUpperArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++)gl.drawArrays ( gl.TRIANGLES, 0, numVertices );
}

function leftLowerArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function rightUpperArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function rightLowerArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function  leftUpperLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function leftLowerLeg() {

    instanceMatrix = mult(modelViewMatrix, translate( 0.0, 0.5 * lowerLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices );
}

function rightUpperLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices);
}

function rightLowerLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth) )
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays( gl.TRIANGLES, 0, numVertices);
}


function quad(a, b, c, d) {
	pointsArray.push(vertices[a]);
     colorsArray.push(vertexColors[a]);
     texCoordsArray.push(texCoord[0]);

     pointsArray.push(vertices[b]);
     colorsArray.push(vertexColors[a]);
     texCoordsArray.push(texCoord[1]);

     pointsArray.push(vertices[c]);
     colorsArray.push(vertexColors[a]);
     texCoordsArray.push(texCoord[2]);

     pointsArray.push(vertices[a]);
     colorsArray.push(vertexColors[a]);
     texCoordsArray.push(texCoord[0]);

     pointsArray.push(vertices[c]);
     colorsArray.push(vertexColors[a]);
     texCoordsArray.push(texCoord[2]);

     pointsArray.push(vertices[d]);
     colorsArray.push(vertexColors[a]);
     texCoordsArray.push(texCoord[3]);

}


function Colorcube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
   	gl.enable(gl.DEPTH_TEST);

    
    //  Load shaders and initialize attribute buffers
    
    program = initShaders( gl, "vertex-shader", "fragment-shader");

    gl.useProgram( program);



    projectionMatrix = ortho(-10.0,10.0,-10.0, 10.0,-10.0,10.0);
    gl.uniformMatrix4fv(gl.getUniformLocation( program, "modelViewMatrix"), false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "projectionMatrix"), false, flatten(projectionMatrix) );

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix")

    Colorcube();

	var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

	var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

	configureTexture();

    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture1 );
    gl.uniform1i(gl.getUniformLocation( program, "Tex0"), 0);

    gl.activeTexture( gl.TEXTURE1 );
    gl.bindTexture( gl.TEXTURE_2D, texture2 );
    gl.uniform1i(gl.getUniformLocation( program, "Tex1"), 1);


	 document.getElementById("ButtonT").onclick = function(){boolstop = !boolstop;};  // Button for stop

    render();
}


var render = function() {
        gl.clear( gl.COLOR_BUFFER_BIT );

		for(i=0; i<numNodes; i++) initNodes(i);
        traverse(torsoId);
		
 if (boolstop)
		{

		if (theta [leftUpperArmId] > - 75 || theta[leftUpperArmId] < -105  ) {
		boolanimat=!boolanimat;
		}

if( boolanimat )
		{
		theta [leftUpperArmId] +=0.5;
		theta [leftLowerArmId] -=0.5;
		theta [leftUpperLegId] -=0.5;
		theta [leftLowerLegId] =+0.5;
		theta [rightUpperArmId] -=0.5;
		theta [rightLowerArmId] =-0.5;
		theta [rightUpperLegId] +=0.5;
		theta [rightLowerLegId] -=0.5;
		}

		else{

	    theta [leftUpperArmId] -=0.5;
		theta [leftLowerArmId] =-0.5;
		theta [leftUpperLegId] +=0.5;
	    theta [leftLowerLegId] -=0.5;
		theta [rightUpperArmId] +=0.5;
	    theta [rightLowerArmId] -=0.5;
		theta [rightUpperLegId] -=0.5;
		theta [rightLowerLegId] =+0.5;
		}


		// console.log(theta [leftUpperArmId]); 
		// console.log(theta [leftLowerArmId]); 

		if (displacement <10.5)
		{
		displacement = displacement+0.08;
		}
		else{
	    displacement=-8.5;
		}

		
		// Head movement
		
		var Camera1=eye[1]+6;
		var Camera2=eye[2];
		
		// Distances from camera and head along three axis
		
		x=Math.pow(displacement+torsoWidth+headHeight-eye[0], 2);
		z=Math.pow(Camera2, 2);
		y=Math.pow(6-Camera1,2);
		
		displacementZ=Math.sqrt(x+z);
		displacementY=Math.sqrt(y+z);
		
		alpha=Math.acos(Camera2/displacementZ);
		lambda=Math.asin((6-Camera1)/displacementY);
		alpha=alpha*180/3.14;
		lambda=-lambda*180/3.14;
		
		if (displacement+torsoWidth+headHeight<eye[0])
		{			
	       alpha=-alpha;
		}
		
		alpha =-90-alpha;
		
		if (Math.abs(alpha)<100)
		{			
	       longitudinal=alpha;
		}
		if (Math.abs(lambda)<45) 
		{
			lateral=lambda;
		}


		}

// Animation
        requestAnimFrame(render);

}
