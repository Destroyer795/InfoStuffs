import { useCallback, useEffect, useRef } from 'react';
import EncryptionWorker from './worker?worker';

export default function useVaultWorker() {
  const pending = useRef(null);
  const cancel = useCallback(() => {
    if (pending.current) {
      pending.current.worker.terminate();
      pending.current.reject(new DOMException('Vault operation cancelled.', 'AbortError'));
      pending.current = null;
    }
  }, []);
  useEffect(() => cancel, [cancel]);
  const run = useCallback((options) => {
    cancel();
    return new Promise((resolve, reject) => {
      const worker = new EncryptionWorker();
      pending.current = { worker, reject };
      const finish = () => { worker.terminate(); pending.current = null; };
      worker.onmessage = ({ data }) => {
        finish();
        if (data.success) resolve(data);
        else reject(new Error(data.error || 'Unable to verify this vault.'));
      };
      worker.onerror = () => { finish(); reject(new Error('The encryption worker stopped. Please retry.')); };
      worker.postMessage(options);
    });
  }, [cancel]);
  return { run, cancel };
}
