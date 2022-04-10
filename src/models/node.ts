import { TreeItem } from '@/components/Tree/types'
import { Task } from '@/models/task'
import Log from '@/services/log'
import { flat } from './flattenedNode'

/**
 * Represent types of the Node.
 */
export const NODE_TYPE = {
  TASK: 'TASK',
  HEADING: 'HEADING',
  OTHER: 'OTHER',
  ROOT: 'ROOT',
}
type NodeType = typeof NODE_TYPE[keyof typeof NODE_TYPE]

/**
 * @see https://qiita.com/SoraKumo/items/1d593796de973095f101
 */
function hasProperties<K extends string>(
  x: unknown,
  ...name: K[]
): x is { [M in K]: unknown } {
  return x instanceof Object && name.every((prop) => prop in x)
}

export interface INode {
  type: NodeType
  line: number
  data: Task | string
  parent: Node
  children: Node[]
  id: string

  toString(): string
  clone(): INode
}

type Predicate = (n: Node) => boolean

export class Node implements TreeItem, INode {
  public type: NodeType
  public line: number
  public data: Task | string
  public parent: Node
  public children: Node[]
  public collapsed: boolean
  public id: string

  public static tryParse(obj: unknown): Node | null {
    if (
      hasProperties(obj, 'type', 'line', 'data', 'parent', 'children', 'id')
    ) {
      const type = obj.type as NodeType
      const line = obj.line as number
      const data = obj.data as string
      const parent = obj.parent as Node

      const node = new Node(type, line, data, parent)
      const children = obj.children as Array<Node>
      node.children.push(...children)
      node.id = obj.id as string
      return node
    } else {
      return null
    }
  }

  public constructor(
    type: NodeType,
    line: number,
    data: Task | string,
    parent?: Node,
  ) {
    this.id = `${Math.random()}`
    this.type = type
    this.line = line
    this.data = data
    this.parent = parent
    this.children = [] as Node[]
  }

  public toString(): string {
    if (this.type === NODE_TYPE.ROOT) return ''
    return this.data.toString()
  }

  public clone(): Node {
    const c = new Node(this.type, this.line, this.data, this.parent)
    c.id = this.id
    c.children = [...this.children]
    c.collapsed = this.collapsed
    if (this.data instanceof Task) {
      c.data = this.data.clone()
    }
    return c
  }

  public isComplete(): boolean {
    if (this.type === NODE_TYPE.TASK) {
      return (this.data as Task).isComplete()
    }
    return false
  }

  public append(node: Node): Node {
    const [cloned] = clone([this])
    const flatten = flat(this)
    node.line = flatten.length + 1
    node.parent = cloned
    cloned.children.push(node)
    return cloned
  }

  public find(predicate: Predicate): Node | null {
    const queue: Node[] = [this]

    // breadth first search
    try {
      while (queue.length > 0) {
        const elm = queue.shift()
        if (predicate(elm)) {
          return elm
        }
        if (elm.children.length > 0) {
          queue.push(...elm.children)
        }
      }
    } catch (e) {
      Log.w(e)
    }
    return null
  }

  public filter(predicate: Predicate): Node {
    const [cloned] = clone([this])
    const queue: Node[] = [cloned]
    const flatten: Node[] = []

    // breadth first search
    try {
      while (queue.length > 0) {
        const elm = queue.shift()
        flatten.push(elm)
        if (elm.children.length > 0) {
          queue.push(...elm.children)
        }
      }

      const reverse = flatten.reverse()

      // Remove nodes
      reverse.forEach((n) => {
        const match = predicate(n)
        if (!match && n.children.length === 0) {
          // remove a node
          const parent = n.parent
          parent.children = parent.children.filter((c) => c.id !== n.id)
        }
      })

      // Update line number
      const flattenFiltered = flat(cloned)
      flattenFiltered.forEach((f, index) => {
        f.node.line = index + 1
      })

    } catch (e) {
      Log.w(e)
    }

    return cloned
  }

  public replace(node: Node, predicate: Predicate): Node {
    const [cloned] = clone([this])
    const target = cloned.find(predicate)
    if (target == null) return cloned
    const parent = target.parent
    if (parent == null) return cloned

    // keep some data of the node.
    node.id = target.id
    node.line = target.line
    node.parent = parent
    node.children = target.children

    parent.children = parent.children.map((n) => {
      return n.id === node.id ? node : n
    })

    return cloned
  }
}

export class HeadingNode extends Node {
  public level: number
  public data: string

  public static tryParse(obj: unknown): HeadingNode | null {
    if (
      hasProperties(
        obj,
        'type',
        'line',
        'data',
        'parent',
        'children',
        'id',
        'level',
      )
    ) {
      const type = obj.type as NodeType
      const line = obj.line as number
      const data = obj.data as string
      const parent = obj.parent as Node
      const level = obj.level as number

      const node = new HeadingNode(type, line, data, level, parent)
      const children = obj.children as Array<Node>
      node.children.push(...children)
      node.id = obj.id as string
      return node
    } else {
      return null
    }
  }

  public constructor(
    type: NodeType,
    line: number,
    data: string,
    level: number,
    parent?: Node,
  ) {
    super(type, line, data, parent)
    this.level = level
  }

  public clone(): HeadingNode {
    const c = new HeadingNode(
      this.type,
      this.line,
      this.data,
      this.level,
      this.parent,
    )
    c.id = this.id
    c.children = [...this.children]
    c.collapsed = this.collapsed
    return c
  }

  public toString(): string {
    return ''.padStart(this.level, '#') + ' ' + this.data
  }
}

function clone(nodes: Node[], parent?: Node): Node[] {
  return nodes.map<Node>((a) => {
    const b = a.clone()
    b.parent = parent
    b.children = clone(b.children, b)
    return b
  })
}

function depthToIndent(depth: number): string {
  return ''.padStart(depth * 2, ' ')
}

export function nodeToString(root: Node): string {
  const flatten = flat(root)
  const lines = flatten.map((item) => {
    if (item.node.type === NODE_TYPE.TASK) {
      let task = item.node.data as Task
      task = task.clone()
      item.node = item.node.clone()
      item.node.data = task
    }
    const indent = depthToIndent(item.depth)
    return `${indent}${item.node.toString()}`
  })

  return lines.join('\n')
}
