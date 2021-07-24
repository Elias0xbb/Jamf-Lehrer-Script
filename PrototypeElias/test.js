const bts = require('./bst');


const array = [];
for(let i = 0; i<100; ++i) {
	array.push({ id: i, val: Math.random()*100 });
}
let tree = bts.fromArray(array, ar => (ar.id));
tree.inorder();
