export async function getPdfPageCount(file) {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist/build/pdf");
  
  // Set worker source - use the same version as the library
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs`;
  
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async function () {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        resolve(pdf.numPages);
      } catch (err) {
        reject(err);
      }
    };
    fileReader.readAsArrayBuffer(file);
  });
}