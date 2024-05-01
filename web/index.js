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
    clientOptions: {
      allowMultiClient: false,
      zoomHack: false
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
    downloadWagonSound() {
      if (this.checksumsData === null) {
        return;
      }

      const originalChecksum = (this.checksumsData?.files["/sounds/wagon_sound.bnk"] ?? null);

      if (originalChecksum === null) {
        return;
      }

      const patch = new Uint8Array(this.cGenerateBinary(DUMMY_WAGON_SOUND_DLL_CRC32, (parseInt(originalChecksum, 16) >>> 0)));

      this.patchFile(DUMMY_WAGON_SOUND_DLL, patch, "wagon_sound.bnk");
    },
    async downloadRavendawnDx() {
      if (this.checksumsData === null) {
        return;
      }

      const originalChecksum = (this.checksumsData?.binary?.checksum ?? null);

      if (originalChecksum === null) {
        return;
      }

      const clientData = await this.corsProxyFetch("https://dw.ravendawn.online/production/ravendawn_dx.exe")
        .then(response => response.blob())
        .then(blob => blob.arrayBuffer())
        .then(buffer => new Uint8Array(buffer))
        .catch(() => null);

      if (clientData === null) {
        return;
      }

      if (this.clientOptions.allowMultiClient === true) {
        const index = findPattern(clientData, [0xFF, 0x15, "?", "?", "?", "?", 0xFF, 0x15, "?", "?", "?", "?", 0x3D, 0xB7, 0x00, 0x00, 0x00, 0x0F, 0x85, "?", "?", "?", "?"]);

        if (index > -1) {
          clientData[index + 13] = 0x28;
        }
      }

      if (this.clientOptions.zoomHack === true) {
        const index = findPattern(clientData, "\x4C\x8B\xD1\xC6\x81?????\x8B\x02\x89\x41?\x8B\x42?\x89\x41?\x44\x8B\x02\x44\x8B\x4A?");

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
            console.log("[ZOOM HACK] Code cave failed");
          }
        }
        else {
          console.log("[ZOOM HACK] Address failed");
        }
      }

      const startCRC = (CRC32.buf(clientData) >>> 0);
      const targetCRC = (parseInt(originalChecksum, 16) >>> 0);

      const patch = new Uint8Array(this.cGenerateBinary(startCRC, targetCRC));

      this.patchFile(clientData, patch, "ravendawn_dx.exe");
    },
    async mounted() {
      this.checksumsData = await this.corsProxyFetch("https://dw.ravendawn.online/production/checksums.txt")
        .then(response => response.json())
        .catch(() => null);
    }
  })
  .mount("#app");
}
