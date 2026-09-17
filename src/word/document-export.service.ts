function getFile(): Promise<Office.File> {
  return new Promise((resolve, reject) => {
    Office.context.document.getFileAsync(Office.FileType.Compressed, { sliceSize: 65536 }, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) resolve(result.value);
      else reject(new Error(result.error?.message || "Không thể đọc file Word hiện tại."));
    });
  });
}

function getSlice(file: Office.File, index: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    file.getSliceAsync(index, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) resolve(result.value.data as number[]);
      else reject(new Error(result.error?.message || `Không đọc được phần ${index + 1} của tài liệu.`));
    });
  });
}

function closeFile(file: Office.File): Promise<void> {
  return new Promise((resolve) => file.closeAsync(() => resolve()));
}

export async function exportCurrentDocumentAsDocx(filename: string): Promise<void> {
  const file = await getFile();
  try {
    const chunks: number[][] = [];
    let total = 0;
    for (let index = 0; index < file.sliceCount; index++) {
      const data = await getSlice(file, index);
      chunks.push(data);
      total += data.length;
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.toLowerCase().endsWith(".docx") ? filename : `${filename}.docx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } finally {
    await closeFile(file);
  }
}

export async function readCurrentDocumentAsArrayBuffer(): Promise<ArrayBuffer> {
  const file = await getFile();
  try {
    const chunks: number[][] = [];
    let total = 0;
    for (let index = 0; index < file.sliceCount; index++) {
      const data = await getSlice(file, index);
      chunks.push(data);
      total += data.length;
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes.buffer;
  } finally {
    await closeFile(file);
  }
}

