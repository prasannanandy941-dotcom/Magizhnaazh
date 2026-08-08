import fs from 'fs-extra';
import path from 'path';

export class LocalStorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir?: string, baseUrl?: string) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'uploads');
    this.baseUrl = baseUrl || 'http://localhost:8002/uploads';
    fs.ensureDirSync(this.uploadDir);
  }

  async saveFile(fileBuffer: Buffer, fileName: string, folder = 'general'): Promise<string> {
    const targetFolder = path.join(this.uploadDir, folder);
    await fs.ensureDir(targetFolder);

    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(targetFolder, safeName);

    await fs.writeFile(filePath, fileBuffer);
    return `${this.baseUrl}/${folder}/${safeName}`;
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    const relativePath = fileUrl.replace(this.baseUrl, '');
    const filePath = path.join(this.uploadDir, relativePath);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      return true;
    }
    return false;
  }
}
