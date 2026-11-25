const VERTEX=`
attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=(a_position+1.0)*0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
const FRAGMENT=`
precision mediump float;
uniform sampler2D u_ink;
uniform vec2 u_size;
uniform vec4 u_lens;
uniform float u_bend;
varying vec2 v_uv;
vec4 ink(vec2 p){return texture2D(u_ink,(p+32.0)/u_size);}
void main(){
  vec2 p=vec2(v_uv.x,1.0-v_uv.y)*u_size-32.0;
  vec2 local=p-u_lens.xy,halfSize=u_lens.zw;
  float radius=min(halfSize.x,halfSize.y);
  vec2 q=abs(local)-(halfSize-radius);
  vec2 outside=max(q,0.0);
  float d=length(outside)+min(max(q.x,q.y),0.0)-radius;
  float coverage=1.0-smoothstep(-0.65,0.65,d);
  if(coverage<=0.0)discard;
  vec2 normal=length(outside)>0.01?normalize(outside)*sign(local):
    (q.x>q.y?vec2(sign(local.x),0.0):vec2(0.0,sign(local.y)));
  float rim=(1.0-smoothstep(0.0,12.0,max(0.0,-d)))*step(0.01,u_bend);
  vec2 ray=p-normal*(rim*rim*u_bend);
  vec4 centre=ink(ray);
  vec4 warm=ink(ray-normal*(rim*0.85));
  vec4 cool=ink(ray+normal*(rim*0.85));
  vec4 colour=mix(centre,(centre*2.0+warm+cool)*0.25,rim*0.65);
  colour.rgb=mix(colour.rgb,vec3(warm.r,colour.g,cool.b),rim*0.45);
  colour.a=max(colour.a,max(warm.a,cool.a)*rim*0.35);
  gl_FragColor=colour*coverage;
}`;

// One cached texture, one small scissored draw. No per-frame image upload,
// shader compilation, filter graph invalidation, GPU readback or geometry read.
export function createLensRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});
  if(!gl)return null;
  const compile=(type,source)=>{
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Lens shader unavailable');}return shader;
  };
  const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
  const fragmentSource=precision?.precision>0?FRAGMENT.replace('precision mediump float','precision highp float'):FRAGMENT;
  const vertex=compile(gl.VERTEX_SHADER,VERTEX),fragment=compile(gl.FRAGMENT_SHADER,fragmentSource),program=gl.createProgram();
  gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw Error('Lens program unavailable');}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  gl.uniform1i(gl.getUniformLocation(program,'u_ink'),0);
  const sizeUniform=gl.getUniformLocation(program,'u_size'),lensUniform=gl.getUniformLocation(program,'u_lens'),bendUniform=gl.getUniformLocation(program,'u_bend');
  gl.uniform1f(bendUniform,7.5);gl.clearColor(0,0,0,0);
  let width=0,height=0,dpr=1,ready=false;
  return {
    upload(image,size){
      ({width,height,dpr}=size);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(sizeUniform,width,height);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);ready=true;
    },
    draw(cx,cy,halfWidth,halfHeight){
      if(!ready)return;
      gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);
      const left=Math.max(0,Math.floor((cx-halfWidth+31)*dpr)),right=Math.min(canvas.width,Math.ceil((cx+halfWidth+33)*dpr));
      const top=Math.max(0,Math.floor((cy-halfHeight+31)*dpr)),bottom=Math.min(canvas.height,Math.ceil((cy+halfHeight+33)*dpr));
      gl.enable(gl.SCISSOR_TEST);gl.scissor(left,canvas.height-bottom,Math.max(0,right-left),Math.max(0,bottom-top));
      gl.uniform4f(lensUniform,cx,cy,halfWidth,halfHeight);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    },
    setSolid(value){gl.uniform1f(bendUniform,value?0:7.5);},
    destroy(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);}
  };
}
