"use strict";

function initializeApp() {
  PetiteVue.createApp({
    calculated: false,
    startCRC: 0,
    wantedCRC: 0,
    baseFilePath: null,
    targetFilePath: null,
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

      const startCRC = CRC32.buf(baseFileData);
      const wantedCRC = CRC32.buf(targetFileData);

      const fileTokens = baseFile.name.split(".");
      const fileName = (fileTokens.length > 1 ? fileTokens.slice(0, fileTokens.length - 1) : fileTokens[0]);
      const fileExtension = (fileTokens.length > 1 ? `.${fileTokens[fileTokens.length - 1]}` : "");
      const patchedFileName = `${fileName}_patched${fileExtension}`;

      const patch = new Uint8Array(patchType === "ascii" ? this.cGenerateAscii(startCRC, wantedCRC) : this.cGenerateBinary(startCRC, wantedCRC));

      this.patchFile(baseFileData, patch, patchedFileName);
    }
  })
  .mount("#app");
}
