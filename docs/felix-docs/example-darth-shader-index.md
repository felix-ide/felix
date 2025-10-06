# Darth Shader Codebase Index

```index
# FILE_PATHS
F1:/app/main/main.js
F2:/app/main/main-react.js
F3:/app/main/preload.js
F4:/app/main/console-window.js
F5:/app/main/console-logger.js
F6:/src/App.js
F7:/src/index.js
F8:/src/store/electronBridge.js
F9:/src/store/managers/WindowManager.js
F10:/src/store/managers/index.js
F11:/src/components/outputs/ShaderOutput.js
F12:/src/components/outputs/window/OutputWindow.js
F13:/src/components/outputs/window/MouseHandler.js
F14:/src/components/common/ShadowShaderCanvas.js
F15:/src/components/ShaderCanvas.js
F16:/src/components/inputs/ShaderPreview.js
F17:/src/contexts/AudioContext.js
F18:/src/utils/audioAPI.js
F19:/src/utils/audioProcessor.js
F20:/app/manager/ThreeShaderRenderer.js
F21:/app/manager/windows/CanvasCopier.js
F22:/app/manager/windows/WindowRegistry.js

# SYSTEMS
S1:WINDOW_MANAGEMENT|Creates and tracks window references|
F2>585-614:BrowserWindow creation
F8>176-201:window.open wrapper
F9>30-65:registerOutput
F9>70-110:window tracking
F12>40-80:output window initialization
F22>20-60:window registry

S2:CANVAS_COPYING|Copies rendered canvases between windows|
F15>180-220:createCanvas
F21>25-80:copyCanvas
F11>730-780:setupCanvasCopy
F12>90-120:receiveCanvas
F9>130-170:setupCanvasCopyInterval

S3:AUDIO_PROCESSING|Captures and processes audio for visualization|
F17>40-106:AudioContext setup
F17>160-226:microphone request
F17>310-456:system audio capture
F18>30-100:audio input handling
F19>45-90:FFT processing
F15>250-300:audio uniform updating

S4:MOUSE_CONTROL|Handles mouse events between windows|
F11>1512-1820:handleMouseEvent
F13>50-150:cursor positioning
F8>215-227:IPC command sending
F2>75-126:output-mouse-event
F12>287-400:handleRemoteMouseEvent

S5:SHADER_RENDERING|Loads and renders GLSL shaders|
F20>100-200:loadShader
F15>350-450:setupThreeJS
F14>70-150:shadowCanvasSetup
F16>120-180:preview rendering

# ELECTRON_APIS
E1:BROWSER_WINDOW|Window creation and management|
F2>591-604:createMainWindow
F2>137-142:getAllWindows iteration
F8>177-180:window.open for React

E2:IPC_MAIN|IPC communication handling|
F2>45-49:commandHandlers declaration
F2>585-587:command registration
F2>75-126:output-mouse-event handler
F2>244-286:create-output handler

E3:DESKTOP_CAPTURER|Screen capture for previews|
F3>21-22:expose to renderer
F8>318-406:getDesktopSources

E4:REMOTE|Cross-process access|
F2>16-18:initialize and enable
F8>38-57:require handling
F8>60-110:module path resolution

E5:WEBCONTENTS_SEND_INPUT_EVENT|Mouse event simulation|
F2>108-117:event forwarding
F11>1520-1540:mousedown handling@CODE@

# CRITICAL_INTERFACES
I1:CANVAS_DIRECT_ACCESS|Direct canvas DOM access between windows|
F11>780-820:canvas reference in main
F21>45-90:cross-window canvas access@CODE@
F9>130-170:canvas copy interval

I2:WINDOW_OPENER_CHAIN|Window references via opener|
F8>176-182:window.open for React
F12>110-130:access parent via opener

I3:AUDIO_SYSTEM_GLOBAL|Global audio state sharing|
F17>78-106:window.audioSystem creation@CODE@
F12>150-170:access via global in child
F15>265-280:shader uniform update from global

I4:WINDOW_POSTMESSAGE|Direct messaging between windows|
F11>359-382:send cursor/event messages
F12>190-230:receive and process messages

# PROBLEM_AREAS
P1:MOUSEDOWN_FREEZE|Mouse events causing UI freeze|
F11>1520-1540:webContents.sendInputEvent call@CODE@
F2>108-117:IPC handling in main process@CODE@
F12>320-350:event dispatching in output window

P2:ELECTRON_UPGRADE|Issues with upgrading Electron|
F2>585-614:BrowserWindow creation with deprecated options
F4>10-40:Remote module usage
F8>38-57:Contextual isolation disabled

# CODE_SNIPPETS
CS1:BROWSER_WINDOW_CREATE|Browser window creation with webPreferences|
F2>585-614:@CODE@

CS2:SEND_INPUT_EVENT|Problematic mouse event sending code|
F11>1520-1540:@CODE@

CS3:CANVAS_COPY_CORE|Core canvas copying mechanism|
F21>45-90:@CODE@

CS4:AUDIO_SYSTEM_GLOBAL_SETUP|Global audio system creation and setup|
F17>78-106:@CODE@

# PIPELINE_FLOWS
PF1:SHADER_CREATION|F6>App initialization>F15>ShaderCanvas creation>F20>ThreeShaderRenderer setup>F14>Shadow canvas linking
PF2:OUTPUT_CREATION|F11>Create output>F8>window.open>F12>Initialize output>F9>Register output window
PF3:CANVAS_COPY_FLOW|F15>Render to canvas>F9>Copy interval>F21>Copy canvas>F12>Display in output
PF4:AUDIO_CAPTURE_FLOW|F17>Request mic>F18>Audio input>F19>Process audio>F17>Update global state>F15>Update uniforms

# CONTEXT_LINKS
CL1:MOUSE_EVENT_SYSTEM|Mouse event handling and issues|
S4:MOUSE_CONTROL
E5:WEBCONTENTS_SEND_INPUT_EVENT
P1:MOUSEDOWN_FREEZE
CS2:SEND_INPUT_EVENT
PF3:CANVAS_COPY_FLOW

CL2:CANVAS_COPYING_SYSTEM|Canvas copying between windows|
S2:CANVAS_COPYING
I1:CANVAS_DIRECT_ACCESS
I2:WINDOW_OPENER_CHAIN
CS3:CANVAS_COPY_CORE
PF3:CANVAS_COPY_FLOW

CL3:AUDIO_PROCESSING|Audio capture and visualization|
S3:AUDIO_PROCESSING
I3:AUDIO_SYSTEM_GLOBAL
CS4:AUDIO_SYSTEM_GLOBAL_SETUP
PF4:AUDIO_CAPTURE_FLOW
```

## Usage Instructions

This index provides a machine-optimized overview of Darth Shader's code structure. Use the following queries with the CodeIndexer tool:

- `EXPAND CS1` - View the browser window creation code
- `CONTEXT CL1` - See all components related to the mouse event system
- `DEEP_EXPAND PF3` - View all code in the canvas copy flow
- `FIND_REFS F11>1520` - Find references to line 1520 in ShaderOutput.js

See `tools/felix/format-machine.md` for a complete reference of the indexing format.