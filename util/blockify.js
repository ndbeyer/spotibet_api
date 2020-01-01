const { times } = require("lodash");
const blockify = (array, n) => {
  if (array.length > n) {
    const NBlocks = Math.ceil(array.length / n);
    const blocks = times(NBlocks).map(() => []);
    let blockCounter = 0;
    array.forEach((item, index) => {
      blocks[blockCounter].push(item);
      blockCounter =
        index % (n - 1) === 0 && index !== 0 ? blockCounter + 1 : blockCounter;
    });
    return [true, blocks];
  } else {
    return [false, array];
  }
};

module.exports.blockify = blockify;
