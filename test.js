const regex = /^(?:(\d+)x\s+)?(.+?)(?:\s+\((.+)\))?$/;
console.log('1x Poster (A4(Portrait))'.match(regex));
console.log('8x Cute Cat'.match(regex));
console.log('Cute Cat'.match(regex));
console.log('Cute Cat (A3)'.match(regex));
