import { createFilesCollection, type FilesCollection } from "@spark/data";
let files: FilesCollection | undefined;
export function getFilesCollection(): FilesCollection { files ??= createFilesCollection(); return files; }
