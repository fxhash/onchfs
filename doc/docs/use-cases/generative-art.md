# ONCHFS for Generative Art

Onchfs was initially built to solve issues regarding uploading Generative Art projects on-chain for fxhash. As such, it particularly shines in such a context. Let's look into a few features of the file system which make it particularly relevant to on-chain Generative Art.

## Existing solutions and their drawbacks

In order to properly understand why onchfs improves upon existing solutions, it's worth looking at the state of the space.

### Art Blocks

The current solution used by Art Blocks revolves arround storing a raw javascript code on-chain, as well as the script dependency (p5js, etc...). **Only the javascript part of the project is stored**, so either they have to

Let's look at a practical example, with a the wonderful project [Torrent, by Jeres released on Art Blocks](https://www.artblocks.io/collections/curated/projects/0x99a9b7c1116f9ceeb1652de04d5969cce509b069/466). If we query the Smart Contract view `projectScriptByIndex(457, 0)`, a string is returned (note that the string has been truncated for practical purposes):

```js
const min=Math.min,max=Math.max,abs=Math.abs,round=Math.round,int=parseInt,map=(e,t,n,o,i)=>o<i?o+(e-t)/(n-t)*(i-o):o-(e-t)/(n-t)*(o-i);let __randomSeed=int(tokenData.hash.slice(50,58),16),rCount=0;function rnd(e,t){rCount++,__randomSeed^=__randomSeed<<13,__randomSeed^=__randomSeed>>17;const n=((__randomSeed^=__randomSeed<<5)<0?1+~__randomSeed:__randomSeed)%1e3/1e3;return null!=t?e+n*(t-e):null!=e?n*e:n}const iden=e=>e,rndint=(e,t)=>int(rnd(e,t)),prb=e=>rnd()<e,posOrNeg=()=>prb(.5)?1:-1,sample=e=>e[Math.floor(rnd(e.length))],noop=()=>{};function chance(...e){const t=e.reduce((e,t)=>e+t[0],0),n=rnd();let o=0;for(let i=0;i<e.length;i++){if(n<=(o+=(!0===e[i][0]?1:!1===e[i][0]?0:e[i][0])/t)&&e[i][0])return e[i][1]}}function times(e,t){const n=[];for(let o=0;o<e;o++)n.push(t(o));return n}const allRunningIntervals=[];function setRunInterval(e,t,n=0){const o=()=>{e(n),n++};o();let i=!1,r=setInterval(o,t);
//...
```

Under the hood, Art Blocks is storing the string as bytes using contract code storage, see contract for reference:

- [GenArt721CoreV3](https://github.com/ArtBlocks/artblocks-contracts/blob/fa51cae3db543b9475a186f981b488e18feecb61/packages/contracts/contracts/GenArt721CoreV3.sol#L1052)
- [BytecodeStorageV1](https://github.com/ArtBlocks/artblocks-contracts/blob/main/packages/contracts/contracts/libs/v0.8.x/BytecodeStorageV1.sol#L132)

This flow roughly works as follows:

- artists **only upload the raw JS portion** of their project
- they specify a dependency, among those made available by Art Blocks
- the string is stored as-is, without compression (using UTF-8 encoding)
- the JS part of the project can be retrieved from the contract

It should be known that some Javascript code, especially the one directly returned by Art Blocks contracts, cannot be executed by itself. A web browser needs to see a valid HTML document it can interpret, which references javascript a way or the other. Moreover, there needs to be a mechanic where iteration inputs are injected so that they are accessible via Javascript. There needs to be a process where an HTML string is built from the various inputs: libraries, inputs, and code. We believe Art Blocks is using an off-chain process to compose such a string (_which by the way is perfectly fine, as proper specifications will allow such reconstructions to easily happen in the future_). The full HTML string for Torrent looks like this:

```text
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/><meta charset="utf-8"/><script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.0.0/p5.min.js"></script><script>let tokenData = {"tokenId":"466000139","hash":"0x898ae0c16d5dce2f9a69db2bc57835c63655b90b828fd399f0cc86c461f5486a"}</script><script>const e=[];for(let t=0;t<32;t++)e.push(tokenData.hash.slice(2+2*t,4+2*t));e.map((e=>parseInt(e,16)));const t=parseInt(tokenData.hash.slice(0,16),16);console.log(`${tokenData.hash}`);let i=new class{constructor(){this.useA=!1;let e=function(e){let t=parseInt(e.substr(0,8),16),i=parseInt(e.substr(8,8),16),r=parseInt(e.substr(16,8),16),o=parseInt(e.substr(24,8),16);return function(){t|=0,i|=0,r|=0,o|=0;let e=(t+i|0)+o|0;return o=o+1|0,t=i^i>>>9,i=r+(r<<3)|0,r=r<<21|r>>>11,r=r+e|0,(e>>>0)/4294967296}};this.prngA=new e(tokenData.hash.substr(2,32)),this.prngB=new e(tokenData.hash.substr(34,32));for(let e=0;e<1e6;e+=2)this.prngA(),this.prngB()}random_dec(){return this.useA=!this.useA,this.useA?this.prngA():this.prngB()}random_num(e,t){return e+(t-e)*this.random_dec()}random_int(e,t){return Math.floor(this.random_num(e,t+1))}random_bool(e){return this.random_dec()<e}random_choice(e){return e[this.random_int(0,e.length-1)]}};const r=()=>i.random_dec(),o=e=>i.random_bool(e),n=(e,t)=>i.random_int(e,t),a=e=>i.random_choice(e);let s=!1,h=new URLSearchParams(window.location.search),d="true"==h.get("print"),u=1*(h.get("width")??1),c=1*(h.get("speed")??0),f=1*(h.get("frame")??0),l=(h.get("scene"),"true"==h.get("animated"));const v="true"==h.get("fullscreen")?window.innerHeight/window.innerWidth:4/3,m=o(.04),p=o(.095),_=!m&&!p&&o(.1),g=p||_?0:Math.max(m?5:1,a([1,2,2,3,3,3,3,3,3,4,4,4,4,5,5,5,6])),w=_?10:p?0:a([1,1,2,2,2,3,3,3,3,4,4,5]),x=m?7:_?0:n(p?4:2,7)+(0==g?2:0),y=n(0,5),A=n(1,3),b=p||o(.9),k=(o(.5),o(.6)),D=!m&&o(1/3),E=!m&&o(.05),C=!_&&!p&&!m&&g>0&&o(.4),F=!_&&!p&&!m&&g>0&&o(.2),B=n(1,12),M=Y(.15+r()/(_?3:1.75)),U=20;var W,T,I,R,S,$,G=0,z=void 0,L=c>0?c:10,P=!1,H=[],O="#F4EEDC",V="#45413C";const N=e=>e.match(/.{6}/g).map((e=>"#"+e)),j=[V,O],J=N("a83830c858484a746a46C6962169BAc93b36c854704c9784948f9f8cd1e0d5773d048962d9103233a89d96c2ffFF8F0100AAFF3E92CC2A628F3E92CC2A628F18435AAAABBCf8c492f7bdd9ee79ba7aa7faF792567DCFB600B2CA1D4E89FF8303FEDEBEfb7c86fca1a0d06549e19b7170d1c955a5a339797e1e4d583763b34876c5a6a2df66DDAAFD5602FE6E00f870302650a1ff4266F3D537EE6ABB92B3D5C1162E0828B68FD8A095A0D55DA7B81B4C49E82A47ABE373"),Q=N("ff6c88ff8199e69ddcc370cf965db3a48ec2a27aa6a06689ba87a7ff5777FD5DA8ff4266732c8a");function Y(e){return Math.floor(1e3*e)/1e3}function q(e){e.strokeWeight(0);var t=e.color("#fff");t.setAlpha(0),e.stroke(t)}const K=e=>e.min(e.width,e.height),X=e=>{var t,r=(t=H,i.random_choice(t)),o=e.color(r);return o.setAlpha(n(D?64:202,242)),o},Z=(e,t,i)=>{e.push();var o=t+e.floor(r()*i);e.stroke(X(e)),e.strokeWeight(e.width/o/2);for(var n=Math.floor((r()-.5)*(o/2)),a=n;a<o+n;a++)(F||m)&&e.stroke(X(e)),e.line(e.width/o*a,0,e.width/o*(a+o/5+3*e.random()),e.height);e.pop()},ee=(e,t,i,n)=>{e.strokeWeight(i);for(var a=0;a<t*(.5+.25*A);a++){var s=X(e),h=o(.2),d=o(.1),u=e.color(h?V:d?O:s);u.setAlpha(n),e.stroke(u),e.line((r()-.25)*e.width*2,(r()-.5)*e.height*2,(r()-.25)*e.width*2,(r()-.5)*e.height*2)}},te=e=>{e.push();var t=r()*e.width/w;e.strokeCap(e.SQUARE);for(var i=0;i<w;i++){e.strokeWeight(K(e)/8*(3*e.random()+1)*(_?.8:1)),e.stroke(X(e));var o=e.width/w*i+t+e.width/2*(r()-.5),n=e.height*(r()-.2)*M;e.line(o,n,o+(r()-.5)*e.width/6,n+e.height*(r()/2.5+.15)*M)}e.pop(),e.push();var a=(e.random()-.4)*e.width,s=e.random()*e.height,h=(e.random()+.5)*K(e)/4,d=m?0:12,u=20/d;e.strokeCap(e.ROUND),e.angleMode(e.DEGREES),e.noFill(),e.stroke(b?V:O),e.strokeWeight(K(e)/600);var c=e.random()*h/4,f=e.random()*h/4;for(i=0;i<d;i++){o=h*Math.cos(i*u)+a+c,n=h*Math.sin(i*u)+s+f;var l=h/(e.random()+.5)/.1;e.line(o,n,o+(e.random()-.015)*l,n+(e.random()-.015)*l),c+=(e.random()-.4)*h/20,f+=(e.random()-.4)*h/20}e.pop()},ie={},re=(e=0,t=!1)=>{var i=ie[e]??((e=0)=>{var t={},i=0==e?k:o(.5);0==e||o(.5),t.u_horiz=i,t.u_x_inv=i;for(var n=1;n<=3;n++){var a=Y(r()/1.5+1/3);t[`u_r${n}`]=a}return t})(e);t||Object.keys(i).forEach((function(e){S.setUniform(e,i[e])})),ie[e]=i,z=e},oe=e=>{if(se(e),q(e),e.background(O),!m&&o(.8)){var t=e.color(X(e));t.setAlpha(60),e.background(t)}var i=C?20:200,n=C?3:1;p||_||(g>0&&Z(e,21/n,i),g>1&&Z(e,21/n,i),e.fill(X(e)),e.rect(0,.25*e.height,e.width,.1*e.height),e.fill(X(e)),e.rect(0,.5*e.height*r(),e.width,e.height/3),g>2&&Z(e,30/n,i),te(e),e.fill(X(e)),e.rect(e.width*r()*.8+.1*e.width,e.height/2,e.width*r(),e.height),g>3&&Z(e,30/n,i)),p||te(e),_||(e=>{var t=4*x;e.fill(X(e));for(var i=0;i<t;i++){if(o(y/10)&&e.fill(X(e)),m&&p){var n=e.color(o(.8)?V:O);n.setAlpha(222),e.fill(n)}o(.1)?q(e):(e.stroke(e.color(b?V:O)),e.strokeWeight(K(e)/600)),e.circle(e.width*r()*.8+.1*e.width,e.height*r()*.8+.1*e.height,.2*K(e)*(.2+r()))}})(e),p||_||(g>4&&Z(e,30/n,i),g>5&&Z(e,8,12)),((e,t=1)=>{var i=m?15:1.5;e.push(),e.noFill(),q(e),e.strokeCap(e.PROJECT),e.blendMode(e.BURN),ee(e,B*t/i,K(e)/1200,220),e.blendMode(e.SOFT_LIGHT),ee(e,500*t/i,K(e)/3e3,140),e.blendMode(e.OVERLAY),ee(e,188*t/i,e.width/10,22),e.pop()})(e,5),e.stroke(e.color(b?V:O)),e.strokeWeight(K(e)/500),e.line(0,0,e.width,0),e.line(0,e.height*M,e.width,e.height*M)},ne=e=>{$=!0,e.loop()},ae=e=>{$=!1,e.noLoop()},se=e=>{ne(e),e.randomSeed(t),e.noiseSeed(t),e.noFill(),e.angleMode(e.DEGREES),W=f},he=(e,t,i)=>{e.save(`Torrent_${tokenData.hash}_f${t}_s${i}.png`)};var de=`canvas { max-width: ${Math.min(window.innerWidth,window.innerHeight*(1/v))}; max-height: ${Math.min(window.innerWidth*v,window.innerHeight)}; }`,ue=document.createElement("style");ue.innerText=de,document.head.appendChild(ue);new p5((function(e){e.preload=function(){},e.setup=function(){e.frameRate(d?100:40),m?j.forEach((e=>H.push(e))):(J.forEach((e=>H.push(e))),E?Q.forEach((e=>H.push(e))):H.push(O));var t=Math.min(window.innerWidth,window.innerHeight*(1/v));u>t*e.pixelDensity()&&(e.pixelDensity(1),t=u);var i=e.pixelDensity(),r=t*v;d?(T=e.createGraphics(t,r),I=e.createCanvas(t,U,e.WEBGL),T.canvas.style.display="block",I.canvas.style.display="none"):I=e.createCanvas(t,r,e.WEBGL);(R=e.createGraphics(1*(k?r:t),1*(k?t:r))).pixelDensity(i),S=e.createShader("precision highp int;precision highp float;attribute vec3 aPosition;attribute vec2 aTexCoord;varying vec2 vTexCoord; void main() { vTexCoord = aTexCoord; vec4 positionVec4 = vec4(aPosition, 1.0); positionVec4.xy = positionVec4.xy * 2.0 - 1.0; gl_Position = positionVec4;}","precision highp int;precision highp float;varying vec2 vTexCoord;uniform sampler2D u_imageInput;uniform float u_time, u_r1, u_r2, u_r3, u_mod, u_speed, u_noise, u_tileoffset, u_tiledivisor;uniform bool u_horiz, u_x_inv;uniform vec2 u_resolution;vec3 fade(vec3 v, float y, bool fade) { return v - (fade ? y/u_mod/9. : 0.); }float tt(float x) { return mod(u_time, 500.) / x / u_speed; }float c(float x) { return float(int(x * 100.)) / 100.; }float r(in vec2 st, in float r1, in float r2, in float r3) { return fract(c(sin(dot(st.xy, vec2(12.989 + r1 + tt(75.), 78.23 + r2 + tt(62.))))) * 43758. + r3 + tt(50.)); }float n(in vec2 st) { vec2 i = floor(st), f = fract(st);float a = r(i, u_r1, u_r2, u_r3), b = r(i + vec2(1., 0.0), u_r1, u_r2, u_r3), c = r(i + vec2(0.0, 1.), u_r1, u_r2, u_r3), d = r(i + vec2(1., 1.), u_r1, u_r2, u_r3);vec2 u = f * f * (3.0 - (2.0) * f);return mix(a, b, u.x) + (c - a) * u.y * clamp(1.0 - u.x, 0., 1.) + (d - b) * u.x * u.y;}float f(in vec2 st) {float v = 0.0, a = 0.9;for(int i = 0; i < 7; i++) {v += a * n(st);st *= 2.2 + u_r3 / 4.;a *= .4;}return v;}void main() {vec2 uv = vTexCoord;float y = 1.0 - uv.y;y = u_tileoffset + y / u_tiledivisor;if (u_horiz) {uv.y = uv.x;uv.x = y;} else {uv.y = y;}if (u_x_inv && u_horiz) { uv.y = 1. - uv.y; }if (u_x_inv && !u_horiz) { uv.x = 1. - uv.x; }uv.y = mod(f(uv) + mod(u_time, 1000.) / u_speed, u_mod);vec3 oC = fade(texture2D(u_imageInput, uv).rgb, uv.y, true);gl_FragColor = vec4(clamp(oC + (fract(sin(dot(uv, vec2(12.9898,78.233)*2.0)) * 43758.5453)) / u_noise, 0., 1.), 1.0);}")},e.draw=function(){if(!s){se(e),s=!0,oe(R),e.shader(S),S.setUniform("u_imageInput",R),S.setUniform("u_resolution",[e.width,e.height]),S.setUniform("u_noise",7.5+(e.width*e.pixelDensity()<2e3?2e3-e.width*e.pixelDensity():0)/250),S.setUniform("u_mod",M),l||d||ae(e);var t=Math.max(0,~~(f/200));if(f>0)for(var i=0;i<t;i++)console.log(`pre config: ${i}`),re(i,!0);W%200==0&&z!=t&&d&&re(t)}e.shader(S);var r=Math.max(0,~~(W/200));r==z||d||re(r),d?(S.setUniform("u_tileoffset",U/T.height*G),S.setUniform("u_tiledivisor",T.height/U)):(S.setUniform("u_tileoffset",0),S.setUniform("u_tiledivisor",1)),S.setUniform("u_speed",120*L),S.setUniform("u_time",W%1e5),e.fill("#fff"),e.rect(0,0,e.width,e.height),d?(T.image(e,0,U*G,T.width,U),++G*U>=T.height&&(setTimeout(he,0,T,W,L),ae(e))):W++,P&&(P=!1,ae(e))},e.windowResized=function(){},e.keyPressed=function(){var t=e.keyCode;d?83==t&&he(T,W,L):(65!=t&&90!=t||(ae(e),W+=90==t?-2:0,P=!0,ne(e)),83==t&&he(e,W-1,L),80==t&&($?ae(e):ne(e)),70==t&&(ne(e),L=Math.max(1,L-1)),68==t&&(ne(e),L+=1))},e.mouseClicked=function(){d||($?ae(e):ne(e))}}),window.document.body);</script><style type="text/css">html {
  height: 100%;
}
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}
canvas {
  padding: 0;
  margin: auto;
  display: block;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}</style></head></html>
```

In essence, something like the following pattern is used to compose the actual HTML output:

```html
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1"
    />
    <meta charset="utf-8" />
    {% if library
    <script src="%%library%%"></script>
    %}
    <script>
      let tokenData = { tokenId: "%%token_id%%", hash: "%%iteration_seed%%" }
    </script>
    <script>
      %%project_code%%
    </script>
    <style type="text/css">
      /* Some generic-purpose css */
    </style>
  </head>
</html>
```

It's interesting to note a few things with this approach:

- the HTML string is built off-chain (it could be built on-chain, as a matter of fact we'll look at such an implementation afterwards)
- the template defines strict rules which can interfer with some artistic practices
- libraries are handled by an authority, there is no way to ensure a library is actually properly served by the authority
  - in such a case we _trust_ Art Blocks for delivering p5js properly, however it seems they are using cloudfare cdn for serving it
  - this opens up a vector for supply chain attacks - what if cloudfare somehow decided to inject a wallet when deliverying p5.min.js ? (this can be mitigated using [checksum verification](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity), which in their case was not implemented at the time this document was written)
  - in any case, there are very few ways for artists to be sure their dependencies are properly delivered (depending on the implementation, there might not be any way), as they need to rely on an authority to do so. Again, mostly fine with Art Blocks as they have a strong incentive to properly maintain that
- artists only have access to a subset of libraries; those maintained by the platform. For instance, [p5js is now at version 1.7.0](https://github.com/processing/p5.js/tags), while only version 1.0.0 seems to be available (released 3 years ago)
- the JS code a stored as a raw string, without any compression
- only the JS code has to be pushed by artists; they don't have to upload the HTML template which saves a few bytes—at the cost of lossing access to html and js directives.
- discrepancies between the dev environment of artists & prod; artists have to use some kind of carefully crafted dev environment that mimics prod behavior

As denoted along many of the points, while the Art Blocks approach works for Art Blocks, it unfortunately doesn't translate well at all in open ecosystems.

### Scripty & EthFS

While ArtBlocks has pionereed Generative Art code stored on-chain, others have improved upon their solution to address some of what they considered to be issues (or sub-optimal solutions) in the Art Blocks approach. One of these projects is [scripty](https://github.com/intartnft/scripty.sol), a set of contracts/tools to handle on-chain code storage and delivery.

**While scripty improves upon a few points, it's worth noting it follows similar principles as Art Blocks conceptually**. The main differences are:

- **HTML reconstruction on-chain**: no need for an external process; the full HTML script can be exported from the contract directly
- **data compression (mostly gzip)**
- **better handling of libraries**: shared between "scripty apps" (leveraging EthFS under the hood), still provided manually by artists

This is a fair improvement, however it still fails to address what we consider to be important issues, mainly revolving around artistic interference & lack of safety & decentralization in handling libraries (due to the inherant nature of ethfs not being fully content-addressed).

## Onchfs

:::info
In this section we'll go through the various features making onchfs particularly relevant for supporting large scale decentralized ecosystems of Generative Projects.
:::

### Preserving code integrity

While previous projects leave an opiniated footprint on how code data is handled for its delivery, onchfs takes a radically different approach allowing artists to be completely free in how their files are handled, while providing low level optimization primitives for commonly shared files. Let's look at a practical example.

```
.
├── index.html
├── style.css
├── main.js
└── libs/
    ├── fxhash.js
    ├── colors.js
    └── processing.min.js
```

`index.html` would import the other files, just like any HTML document would when executed under normal circumstances:

```html
<html>
  <head>
    <script src="./libs/fxhash.js"></script>
    <script src="./libs/colors.js"></script>
    <script src="./libs/processing.min.js"></script>
    <script src="./main.js"></script>
    <link ref="stylesheet" href="./style.css" />
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

So locally, artists can work on a version that's fully functionnal and which will be a 1:1 map of what they will be releasing online, no surprises.

When uploading, the same file structure will be uploaded, and onchfs will ensure the content is delivered in its original form, without adding any artifact.

### Library handling

Onchfs also handles libraries elegantly, and so naturally by its design. Looking at the previous example, and due to the fully deterministic nature of the protocol, a list of inscriptions is precomputed before any data is uploaded on-chain. It will compress files with gzip, chunk files, compute metadata based on file type, and eventually compute the unique content identifier of each file/folder in the project (including the root directory). From this operations, a list of inscriptions is emitted. Ex:

```
.                             -> 0xb3b3b3d1...
├── index.html                -> 0xa1b2c3d4...
├── style.css                 -> 0xaeaeaed2...
├── main.js                   -> 0xa2a2a2a9...
└── libs/                     -> 0xd5d5d5d5...
    ├── fxhash.js             -> 0xc6c6c6c6...
    ├── colors.js             -> 0xabcdef12...
    └── processing.min.js     -> 0x01010101...

inscriptions:
+ CHUNK [0] processing.min.js
+ CHUNK [1] processing.min.js
+ CHUNK [2] processing.min.js
+ FILE processing.min.js (0x01010101...)
+ ...
+ DIRECTORY libs (0xd5d5d5d5...)
  {
    "fxhash.js": 0xc6c6c6c6...,
    "colors.js": 0xabcdef12...,
    "processing.min.js": 0x01010101...,
  }
+ ...
+ CHUNK [0] index.html
+ CHUNK [1] index.html
+ FILE index.html (0xa1b2c3d4...)
+ DIRECTORY root (0xb3b3b3d1...)
```

**Now that's where the magic kicks in 🪄**. Because onchfs is fully deterministic, any file that's a 1:1 copy of another file will have a same CID, due to the properties of the system (it being content-addressed). So, if in the past the platform or another artist has uploaded a same file, it will already exist on onchfs. As such, related inscriptions can just be removed from what's going to be inserted:

```
inscriptions:
--CHUNK [0] processing.min.js--  <-┐
--CHUNK [1] processing.min.js--  <-┤
--CHUNK [2] processing.min.js--  <-┼─ removed from inscriptions
--FILE processing.min.js--       <-┘
+ ...
+ DIRECTORY libs (0xd5d5d5d5...)
  {
    "fxhash.js": 0xc6c6c6c6...,
    "colors.js": 0xabcdef12...,
    "processing.min.js": 0x01010101...,  <- points to existing resource
  }
+ ...
+ CHUNK [0] index.html
+ CHUNK [1] index.html
+ FILE index.html (0xa1b2c3d4...)
+ DIRECTORY root (0xb3b3b3d1...)
```

Effectively, in this case, there will just be a `libs` directory which will have a `processing.min.js` file pointing to an already existing resource.

That's the whole beauty behind this system. It provides trustless file handling where arists don't have to care about specifying the right library, they can just use commonly used libraries—as they've always been doing—and the system will take care of optimizing insertions based on whether such libraries are already available on the onchfs.

Moreover, this introduces a paradigm of trustless and fully open resources sharing, as no one has to rely on a centralized platform to provide a library, or a set of personal tools they keep reusing over time; if they upload it once, it will become available forever for free for everyone using onchfs.

### Optimization for http delivery

As web documents have become the most common medium for Generative Art pieces on blockchains (rightfully so due to the many benefits they bring), it's been as common to serve content using HTTP, the web protocol for accessing resources on the web.

Every file uploaded to onchfs should have some metadata attached to it, specifying:

- `content-type`: the type of the resource, can be `text/html`, `application/javascript`, even `image/png`
- `content-encoding`: specifies how the data was compressed, by default `gzip` due to its great results for text files as well as its wide support

The [HPACK](https://httpwg.org/specs/rfc7541.html) compression algorithm is used to encode file metadata on-chain, as such metadata will be turned into http headers upon content delivery by onchfs proxies.

Of course, as an artist this whole process is completely hidden away; and that's also why it really shine. It ensures complete creative freedom while providing an optimal framework for storing and delivering the assets.

:::info File metadata
See [the documentation on file metadata](../concepts/file-objects/file.md#file-metadata)
:::
