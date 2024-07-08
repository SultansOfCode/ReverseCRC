"use strict";

function findPattern(data, pattern, startIndex = 0) {
  pattern = new Uint8Array(
    Array.isArray(pattern) === true ?
    pattern.map(value => Number.isInteger(value) === true ? value : value.charCodeAt(0)) :
    pattern
      .split("")
      .map(value => value.charCodeAt(0))
  );

  let dataIndex = startIndex;
  let patternIndex = 0;

  while (dataIndex < data.length) {
    const dataByte = data[dataIndex];
    const patternByte = pattern[patternIndex];

    if (dataByte === patternByte || patternByte === 0x3F) {
      ++patternIndex;

      if (patternIndex === pattern.length) {
        return dataIndex - pattern.length + 1;
      }
    }
    else {
      patternIndex = 0;
    }

    ++dataIndex;
  }

  return -1;
}

function initializeApp() {
  PetiteVue.createApp({
    calculated: false,
    startCRC: 0,
    wantedCRC: 0,
    baseFilePath: null,
    targetFilePath: null,
    checksumsData: null,
    dummyDllName: "anybrain_dummy.dll",
    clientOptions: {
      caveLight: false,
      groundTile: false,
      multiClient: false,
      worldLight: false,
      zoom: false
    },
    cGenerateAscii: Module.generateAscii,
    cGenerateBinary: Module.generateBinary,
    get patchAsciiSuccess() {
      if (this.calculated === false) {
        return false;
      }

      if (Array.isArray(this.patchAscii) === false) {
        return false;
      }

      if (this.patchAscii.length !== 6) {
        return false;
      }

      if (this.patchAscii.every(value => value === 0) === true) {
        return false;
      }

      return true;
    },
    get patchBinarySuccess() {
      if (this.calculated === false) {
        return false;
      }

      if (Array.isArray(this.patchBinary) === false) {
        return false;
      }

      if (this.patchBinary.length !== 4) {
        return false;
      }

      if (this.patchBinary.every(value => value === 0) === true) {
        return false;
      }

      return true;
    },
    get patchAsciiString() {
      if (this.patchAsciiSuccess === false) {
        return "";
      }

      return this.patchAscii
        .map(value => String.fromCharCode(value))
        .join("");
    },
    get patchBinaryString() {
      if (this.patchBinarySuccess === false) {
        return "";
      }

      return this.patchBinary
        .map(value => `0x${value.toString(16).padStart(2, "0")}`)
        .join(" ");
    },
    get filesToPatch() {
      return (this.baseFilePath !== null && this.targetFilePath !== null);
    },
    generateAscii(startCRC, wantedCRC) {
      if (this.cGenerateAscii === null) {
        return [];
      }

      return this.cGenerateAscii(startCRC, wantedCRC);
    },
    generateBinary(startCRC, wantedCRC) {
      if (this.generateBinary === null) {
        return [];
      }

      return this.cGenerateBinary(startCRC, wantedCRC);
    },
    generateCRC() {
      const startCRC = parseInt(this.startCRC, 16);
      const wantedCRC = parseInt(this.wantedCRC, 16);

      const patchAscii = this.generateAscii(startCRC, wantedCRC);
      const patchBinary = this.generateBinary(startCRC, wantedCRC);

      this.patchAscii = patchAscii;
      this.patchBinary = patchBinary;

      this.calculated = true;
    },
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = event => {
          const data = new Uint8Array(event.target.result);

          resolve(data);
        };

        reader.onerror = error => {
          reject(error);
        };

        reader.readAsArrayBuffer(file);
      })
    },
    downloadFile(blob, fileName) {
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;
      a.download = fileName;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);
    },
    patchFile(originalData, patchData, fileName) {
      const patched = new Uint8Array(originalData.length + patchData.length);

      patched.set(originalData, 0);
      patched.set(patchData, originalData.length);

      const blob = new Blob([patched], {
        type: "application/octet-stream"
      });

      this.downloadFile(blob, fileName);
    },
    patchFileManually(patchType) {
      if (this.calculated === false) {
        return;
      }

      if (["ascii", "binary"].includes(patchType) === false) {
        return;
      }

      const fileInput = document.createElement("input");

      fileInput.type = "file";
      fileInput.classList.toggle("hidden");

      fileInput.onchange = async event => {
        const file = event.target.files[0];
        const fileTokens = file.name.split(".");
        const fileName = (fileTokens.length > 1 ? fileTokens.slice(0, fileTokens.length - 1) : fileTokens[0]);
        const fileExtension = (fileTokens.length > 1 ? `.${fileTokens[fileTokens.length - 1]}` : "");

        document.body.removeChild(fileInput);

        if (file === void 0 || file === null) {
          return;
        }

        const data = await this.readFile(file).catch(() => null);

        if (data === null) {
          return;
        }

        const patch = new Uint8Array(patchType === "ascii" ? this.patchAscii : this.patchBinary);
        const patchedFileName = `${fileName}_patched${fileExtension}`;

        this.patchFile(data, patch, patchedFileName);
      };

      document.body.appendChild(fileInput);

      fileInput.click();
    },
    async patchFiles(patchType) {
      if (this.baseFilePath === null || this.targetFilePath === null) {
        return;
      }

      if (this.$refs.baseFile.files.length === 0) {
        return;
      }

      if (this.$refs.targetFile.files.length === 0) {
        return;
      }

      if (["ascii", "binary"].includes(patchType) === false) {
        return;
      }

      const baseFile = this.$refs.baseFile.files[0];
      const targetFile = this.$refs.targetFile.files[0];

      const baseFileData = await this.readFile(baseFile).catch(() => null);
      const targetFileData = await this.readFile(targetFile).catch(() => null);

      if (baseFileData === null || targetFileData === null) {
        return;
      }

      const startCRC = (CRC32.buf(baseFileData) >>> 0);
      const wantedCRC = (CRC32.buf(targetFileData) >>> 0);

      const fileTokens = baseFile.name.split(".");
      const fileName = (fileTokens.length > 1 ? fileTokens.slice(0, fileTokens.length - 1) : fileTokens[0]);
      const fileExtension = (fileTokens.length > 1 ? `.${fileTokens[fileTokens.length - 1]}` : "");
      const patchedFileName = `${fileName}_patched${fileExtension}`;

      const patch = new Uint8Array(patchType === "ascii" ? this.cGenerateAscii(startCRC, wantedCRC) : this.cGenerateBinary(startCRC, wantedCRC));

      this.patchFile(baseFileData, patch, patchedFileName);
    },
    corsProxyFetch(url) {
      return fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
    },
    downloadAnybrainDLL() {
      if (this.checksumsData === null) {
        return;
      }

      const originalChecksum = (this.checksumsData?.files[`/sounds/${fileName}`] ?? null);

      if (originalChecksum === null) {
        return;
      }

      let fileName = this.dummyDllName;

      if (fileName.length === 0) {
        fileName = "dummy_anybrain.dll";
      }
      else if (fileName.indexOf(".") === -1) {
        fileName += ".dll";
      }

      const patch = new Uint8Array(this.cGenerateBinary(DUMMY_ANYBRAIN_DLL_CRC32, (parseInt(originalChecksum, 16) >>> 0)));

      this.patchFile(DUMMY_ANYBRAIN_DLL, patch, fileName);
    },
    downloadAnybrainINI() {
      let fileName = this.dummyDllName;

      if (fileName.length === 0) {
        fileName = "dummy_anybrain.ini";
      }
      else if (fileName.indexOf(".") === -1) {
        fileName += ".ini";
      }
      else {
        const fileNameTokens = fileName.split(".");

        fileNameTokens.pop();

        fileNameTokens.push("ini");

        fileName = fileNameTokens.join(".");
      }

      const blob = new Blob([DUMMY_ANYBRAIN_INI], {
        type: "application/octet-stream"
      });

      this.downloadFile(blob, fileName);
    },
    async downloadRavendawnDx() {
      if (this.checksumsData === null) {
        return;
      }

      const originalChecksum = (this.checksumsData?.binary?.checksum ?? null);

      if (originalChecksum === null) {
        return;
      }

      const clientData = await this.corsProxyFetch(`https://dw.ravendawn.online/production/ravendawn_dx.exe?r=${Math.random()}`)
        .then(response => response.blob())
        .then(blob => blob.arrayBuffer())
        .then(buffer => new Uint8Array(buffer))
        .catch(() => null);

      if (clientData === null) {
        return;
      }

      if (this.clientOptions.multiClient === true) {
        const index = findPattern(clientData, [0xFF, 0x15, "?", "?", "?", "?", 0xFF, 0x15, "?", "?", "?", "?", 0x3D, 0xB7, 0x00, 0x00, 0x00, 0x0F, 0x85, "?", "?", "?", "?"]);

        if (index > -1) {
          clientData[index + 13] = 0x28;
        }
        else {
          console.log("[MULTI CLIENT] Address failed");
        }
      }

      if (this.clientOptions.caveLight === true) {
        const index = findPattern(clientData, [0xF3, 0x0F, 0x11, 0x45, "?", 0xF3, 0x0F, 0x11, 0x55, "?", 0xF3, 0x0F, 0x58, 0xC8, 0xF3, 0x0F, 0x5C, 0xCE, 0xF3, 0x0F, 0x11, 0x4D, "?", 0xF3, 0x0F, 0x58, 0xDA, 0xF3, 0x0F, 0x5C, 0xDE, 0xF3, 0x0F, 0x11, 0x5D, "?", 0x80, 0x7D, "?", 0x00, 0x74, "?"]);

        if (index > -1) {
          clientData[index + 3] = 0x4D;
        }
        else {
          console.log("[CAVE LIGHT] Address failed");
        }
      }

      if (this.clientOptions.groundTile === true) {
        const index = findPattern(clientData, [0x0F, 0x11, 0x85, "?", "?", "?", "?", 0x45, 0x8B, 0x81, "?", "?", "?", "?", 0x44, 0x89, 0x85, "?", "?", "?", "?", 0x44, 0x3B, 0xC1, 0x0F, 0x85, "?", "?", "?", "?"]);

        if (index > -1) {
          clientData[index + 2] = 0x8D;
        }
        else {
          console.log("[GROUND TILE] Address failed");
        }
      }

      if (this.clientOptions.worldLight === true) {
        const index = findPattern(clientData, [0x8B, 0x45, 0xB0, 0x89, 0x05, "?", "?", "?", "?", 0x8B, 0x45, 0xB4, 0x89, 0x05, "?", "?", "?", "?", 0x0F, 0xB6, 0x45, 0xB8, 0x88, 0x05, "?", "?", "?", "?", 0x0F, 0xB6, 0x45, 0xB9, 0x88, 0x05, "?", "?", "?", "?"]);

        if (index > -1) {
          clientData[index + 18] = 0xB0;
          clientData[index + 19] = 0xD7;
          clientData[index + 20] = 0x90;
          clientData[index + 21] = 0x90;

          clientData[index + 28] = 0xB0;
          clientData[index + 29] = 0xFF;
          clientData[index + 30] = 0x90;
          clientData[index + 31] = 0x90;
        }
        else {
          console.log("[WORLD LIGHT] Address failed");
        }
      }

      if (this.clientOptions.zoom === true) {
        const index = findPattern(clientData, [0x4C, 0x8B, 0xD1, 0xC6, 0x81, "?", "?", "?", "?", "?", 0x8B, 0x02, 0x89, 0x41, "?", 0x8B, 0x42, "?", 0x89, 0x41, "?", 0x44, 0x8B, 0x02, 0x44, 0x8B, 0x4A, "?"]);

        if (index > -1) {
          const codeCaveIndex = findPattern(clientData, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], index);

          if (codeCaveIndex > -1) {
            const diffGo = codeCaveIndex - index - 5;
            const diffBack = index - codeCaveIndex - 28 + 5;

            clientData[index + 0] = 0xE9;
            clientData[index + 1] = (diffGo >>  0) & 0xFF;
            clientData[index + 2] = (diffGo >>  8) & 0xFF;
            clientData[index + 3] = (diffGo >> 16) & 0xFF;
            clientData[index + 4] = (diffGo >> 24) & 0xFF;
            clientData[index + 5] = 0x90;
            clientData[index + 6] = 0x90;
            clientData[index + 7] = 0x90;
            clientData[index + 8] = 0x90;
            clientData[index + 9] = 0x90;

            clientData[codeCaveIndex +  0] = 0xC7;
            clientData[codeCaveIndex +  1] = 0x02;
            clientData[codeCaveIndex +  2] = 0x29;
            clientData[codeCaveIndex +  3] = 0x00;
            clientData[codeCaveIndex +  4] = 0x00;
            clientData[codeCaveIndex +  5] = 0x00;

            clientData[codeCaveIndex +  6] = 0xC7;
            clientData[codeCaveIndex +  7] = 0x42;
            clientData[codeCaveIndex +  8] = 0x04;
            clientData[codeCaveIndex +  9] = 0x1D;
            clientData[codeCaveIndex + 10] = 0x00;
            clientData[codeCaveIndex + 11] = 0x00;
            clientData[codeCaveIndex + 12] = 0x00;

            clientData[codeCaveIndex + 13] = 0x49;
            clientData[codeCaveIndex + 14] = 0x89;
            clientData[codeCaveIndex + 15] = 0xCA;

            clientData[codeCaveIndex + 16] = 0xC6;
            clientData[codeCaveIndex + 17] = 0x81;
            clientData[codeCaveIndex + 18] = 0x92;
            clientData[codeCaveIndex + 19] = 0x00;
            clientData[codeCaveIndex + 20] = 0x00;
            clientData[codeCaveIndex + 21] = 0x00;
            clientData[codeCaveIndex + 22] = 0x01;

            clientData[codeCaveIndex + 23] = 0xE9;
            clientData[codeCaveIndex + 24] = (diffBack >>  0) & 0xFF;
            clientData[codeCaveIndex + 25] = (diffBack >>  8) & 0xFF;
            clientData[codeCaveIndex + 26] = (diffBack >> 16) & 0xFF;
            clientData[codeCaveIndex + 27] = (diffBack >> 24) & 0xFF;
          }
          else {
            console.log("[ZOOM] Code cave failed");
          }
        }
        else {
          console.log("[ZOOM] Address failed");
        }
      }

      const startCRC = (CRC32.buf(clientData) >>> 0);
      const targetCRC = (parseInt(originalChecksum, 16) >>> 0);

      const patch = new Uint8Array(this.cGenerateBinary(startCRC, targetCRC));

      this.patchFile(clientData, patch, `ravendawn_dx-${Math.trunc((new Date()).valueOf() / 1000)}.exe`);
    },
    async mounted() {
      this.checksumsData = await this.corsProxyFetch(`https://dw.ravendawn.online/production/checksums.txt?r=${Math.random()}`)
        .then(response => response.json())
        .catch(() => null);
    }
  })
  .mount("#app");
}
