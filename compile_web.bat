cls
del web\reversecrcweb.js
del web\reversecrcweb.wasm
em++ -lembind -o web\reversecrc.js reversecrc_web.cpp Crc32.cpp
