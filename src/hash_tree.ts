// enum TreeLabels {
//     Empty = 0,
//     Fork = 1,
//     Labeled = 2,
//     Leaf = 3,
//     Pruned = 4,
// }

import { HashTree } from "@dfinity/agent"

// declare const enum NodeId {
//     Empty = 0,
//     Fork = 1,
//     Labeled = 2,
//     Leaf = 3,
//     Pruned = 4
// }

interface TreeLabel {
    name: ArrayBuffer,
    value: TreeNode
}

interface TreeNode {
    value?: ArrayBuffer
    nodes: TreeLabel[]
    // nodes: Record<string, TreeNode>
}

export class Tree {
    node: TreeNode

    constructor() {
        this.node = {nodes: []}
    }

    insertValue(path: (Buffer | string)[], val: Buffer | string | number) {
        const node = this.traverseTree(this.node, path)
        
        if (typeof val === 'string') {
            val = Buffer.from(new TextEncoder().encode(val))
        }
        if (typeof val === 'number') {
            val = Buffer.from([val])
        }
        
        node.value = val
    }

    traverseTree(node: TreeNode, path: (Buffer | string)[]): TreeNode {
        if (path.length === 0) {
            return node
        }

        let name = path[0]
        if (typeof name === 'string') {
            name = Buffer.from(new TextEncoder().encode(name))
        }

        // let res: TreeNode = node.nodes[name]

        const match = node.nodes.filter((x) => Buffer.compare(Buffer.from(x.name), name as Buffer) == 0)
        let nextNode: TreeNode

        if (match.length === 0) {
            const label: TreeLabel = {
                name: name,
                value: { nodes: [] }
            }
            node.nodes.push(label)
            nextNode = label.value
        } else {
            nextNode = match[0].value
        }

        return this.traverseTree(nextNode, path.slice(1))
    }

    getHashTree(): HashTree {
        return makeHashTree(this.node)
    }
}


function makeHashTree(node: TreeNode): HashTree {
    if (node.nodes.length > 0) {
        const items: HashTree[] = node.nodes.map((x) => [2, x.name, makeHashTree(x.value)]);

        return fork(items)
    }
    if (node.value !== undefined) {
        return [3, node.value]
    }
    return [0]
    
}
function fork(items: HashTree[]): HashTree {
    if (items.length === 1) {
        return items[0]
    }
    if (items.length === 2) {
        return [1, items[0], items[1]]
    }
    if (items.length === 3) {
        return [1, items[0], fork(items.slice(1))]
    }

    return items[0]
}

// Builds tree based on path and value
export function makeHashTreeOld(path: (Buffer | string)[], val: Buffer | string): HashTree {
    if (typeof val === 'string') {
        val = Buffer.from(new TextEncoder().encode(val))
    }
    let prev: HashTree = [3, val]

    for (let item of path.reverse()) {
        if (typeof item === 'string') {
            item = Buffer.from(new TextEncoder().encode(item))
        }

        const treeItem = [2, item, prev]
        prev = treeItem
    }

    return prev
}

// function clone(tree: HashTree): HashTree {
//     let item: HashTree = [...tree]

//     return item
// }

export function mergeTrees(tree1: HashTree, tree2: HashTree): HashTree {
    let item: HashTree = [0]

    if (tree1[0] === 2) {
        if (tree2[0] === 2) {
            if (Buffer.compare(tree1[1] as Buffer, tree2[1] as Buffer) === 0) {
                //the same label
                const val = mergeTrees(tree1[2], tree2[2])
                item = [2, tree1[1], val]
            } else {
                //label is different
                item = [1, tree1, tree2]
            }
        }
    }

    return item
}
