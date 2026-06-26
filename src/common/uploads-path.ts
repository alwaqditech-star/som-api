import { join } from 'path';

/** على Vercel الملفات تُكتب في /tmp فقط — /var/task للقراءة */
export function getUploadsRoot(): string {
  const base = process.env.VERCEL ? '/tmp' : process.cwd();
  return join(base, 'uploads');
}
