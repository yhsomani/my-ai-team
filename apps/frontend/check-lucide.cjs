const lucide = require('lucide-react');
const keys = Object.keys(lucide);
console.log('Total icons:', keys.length);
console.log('Icons starting with G:', keys.filter(k => k.startsWith('G')));
console.log('Icons starting with C:', keys.filter(k => k.startsWith('C')));
