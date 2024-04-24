"use strict";

PetiteVue.createApp({
  calculated: false,
  startCrc: 0,
  wantedCrc: 0,
  cGenerateAscii: null,
  cGenerateBinary: null,
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
  generateAscii(startCrc, wantedCrc) {
    if (this.cGenerateAscii === null) {
      return [];
    }

    return this.cGenerateAscii(startCrc, wantedCrc);
  },
  generateBinary(startCrc, wantedCrc) {
    if (this.generateBinary === null) {
      return [];
    }

    return this.cGenerateBinary(startCrc, wantedCrc);
  },
  generateCrc() {
    const startCrc = parseInt(this.startCrc, 16);
    const wantedCrc = parseInt(this.wantedCrc, 16);

    const patchAscii = this.generateAscii(startCrc, wantedCrc);
    const patchBinary = this.generateBinary(startCrc, wantedCrc);

    this.patchAscii = patchAscii;
    this.patchBinary = patchBinary;

    this.calculated = true;
  },
  patchFile(patchType) {
    if (this.calculated === false) {
      return;
    }

    if (["ascii", "binary"].includes(patchType) === false) {
      return;
    }

    const fileInput = document.createElement("input");

    fileInput.type = "file";

    fileInput.onchange = event => {
      const file = event.target.files[0];
      const fileTokens = file.name.split(".");
      const fileName = (fileTokens.length > 1 ? fileTokens.slice(0, fileTokens.length - 1) : fileTokens[0]);
      const fileExtension = (fileTokens.length > 1 ? `.${fileTokens[fileTokens.length - 1]}` : "");

      document.body.removeChild(fileInput);

      if (file === void 0 || file === null) {
        return;
      }

      const reader = new FileReader();

      reader.onload = event => {
        const data = new Uint8Array(event.target.result);
        const patch = new Uint8Array(patchType === "ascii" ? this.patchAscii : this.patchBinary);
        const patched = new Uint8Array(data.length + patch.length);

        patched.set(data, 0);
        patched.set(patch, data.length);

        const blob = new Blob([patched], {
          type: "application/octet-stream"
        });

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;
        a.download = `${fileName}_patched${fileExtension}`;

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);
      }

      reader.readAsArrayBuffer(file);
    };

    document.body.appendChild(fileInput);

    fileInput.click();
  },
  initialize() {
    if (this.cGenerateAscii !== null || this.cGenerateBinary !== null) {
      return;
    }

    this.cGenerateAscii = window.Module.generateAscii;
    this.cGenerateBinary = window.Module.generateBinary;
  },
  mounted() {
    window.vueApp = this;

    if (Module === void 0 || Module === null) {
      return;
    }

    this.initialize();
  }
})
.mount("#app");
