import {rename} from 'node:fs/promises';
import {setTimeout} from 'node:timers/promises';

/** Windows scanners/readers can briefly hold a freshly written file or directory. */
export async function renameWithRetry(from,to){
  for(let attempt=0;;attempt++){
    try{return await rename(from,to);}
    catch(error){
      if(process.platform!=='win32'||!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=5)throw error;
      await setTimeout(50*2**attempt);
    }
  }
}
