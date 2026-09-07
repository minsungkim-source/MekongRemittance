/* The dataset is produced by the Python pipeline in scripts/ and imported at
   build time, so the page still makes no request for its own numbers. */
import dataset from '@/data/build/dataset.json';

/* The pipeline writes ASCII "--" to stay encoding-safe; the page shows real
   dashes. The single-file build did this substitution at assembly time. */
const EM = /(?<=[^-\\])--(?=[^->])/g;
export const DATA = JSON.parse(JSON.stringify(dataset).replace(EM, '—'));
export default DATA;
