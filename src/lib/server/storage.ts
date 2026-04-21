import fs from "node:fs";
import path from "node:path";

const ROOT = /* turbopackIgnore: true */ process.cwd();
const DATA_DIR = process.env.STUDYANY_DATA_DIR
  ? path.resolve(/* turbopackIgnore: true */ ROOT, process.env.STUDYANY_DATA_DIR)
  : path.join(ROOT, "local-data");

function ensure(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function getDataDir() {
  return ensure(DATA_DIR);
}

export function getDatabasePath() {
  return path.join(getDataDir(), "study-any.sqlite");
}

export function getUploadsDir(workspaceId?: string) {
  const base = ensure(path.join(getDataDir(), "uploads"));
  return workspaceId ? ensure(path.join(base, workspaceId)) : base;
}

export function getCourseContextDir(courseId?: string) {
  const base = ensure(path.join(getDataDir(), "course-context"));
  return courseId ? ensure(path.join(base, courseId)) : base;
}

export function getExportsDir() {
  return ensure(path.join(getDataDir(), "exports"));
}

export function getImportsDir() {
  return ensure(path.join(getDataDir(), "imports"));
}

export function getSeedDir() {
  return ensure(path.join(getDataDir(), "seed"));
}

export function writeTextFile(targetPath: string, contents: string) {
  ensure(path.dirname(targetPath));
  fs.writeFileSync(targetPath, contents, "utf8");
}

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
