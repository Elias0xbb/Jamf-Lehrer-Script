// Binary Search True
class binaryTree {
	constructor(name, value) {
		this.name = name;
		this.value = value;

		this.nodeL = null;
		this.nodeR = null;
	}

	static async search(node, name) {
		if(node === null) return null;
		if(node.name == name) return node;
		return name < node.name ? await this.search(node.nodeL) : await this.search(node.nodeR);
	}

	static async closest(node, priorNode, name) {
		if(node === null) return priorNode;
		if(node.name == name) return node;
		return name < node.name ? await this.closest(node.nodeL, node, name) : await this.closest(node.nodeR, node, name);
	}

	static append(node, newNode) {
		if(newNode.name < node.name) {
			if(node.nodeL === null) node.nodeL = newNode;
			else this.append(node.nodeL, newNode);
		} else {
			if(node.nodeR === null) node.nodeR = newNode;
			else this.append(node.nodeR, newNode);
		}
	}

	static fromArray(data, idFromData) {
		data = data.sort();
		return this.fromSortedArray(idFromData, data, 0, data.length-1);
	}
	static fromSortedArray(idFromData, data, minIdx, maxIdx) {
		if(minIdx >= maxIdx) return null;

		const mid = Math.floor((minIdx + maxIdx)/2);

		let root = new binaryTree(idFromData(data[mid]), data[mid]);
		root.nodeL = this.fromSortedArray(idFromData, data, minIdx, mid);
		root.nodeR = this.fromSortedArray(idFromData, data, mid, maxIdx);
		return root;
	}

	static inorder(node) {
		if(node !== null) {
			this.inorder(node.nodeL);
			console.log(node.name);
			this.inorder(node.nodeR);
		}
	}
}

module.exports = binaryTree;
