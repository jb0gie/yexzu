# Node

The base class for all other nodes.

### `node.id`: String

The ID of the node. This is auto generated when creating nodes via script. For GLTF models converted to nodes, it uses the same object name you would see in blender.

NOTE: Blender GLTF exporter does rename objects in some cases, eg by removing spaces. Best practice is to simply name everything in UpperCamelCase with no other characters.

### `node.position`: Vector3

The local position of the node.

### `node.quaternion`: Quaternion

The local quaternion rotation of the node. Updating this automatically updates the `rotation` property.

### `node.rotation`: Euler

The local euler rotation of the node. Updating this automatically updates the `quaternion` property.

### `node.scale`: Vector3

The local scale of the node.

### `node.matrixWorld`: Matrix4

The world matrix of this node in global space.

### `node.parent`: Node

The parent node, if any.

### `node.add(otherNode)`: Self

Adds `otherNode` as a child of this node.

### `node.remove(otherNode)`: Self

Removes `otherNode` if it is a child of this node.

### `node.traverse(callback)`

Traverses this and all descendents calling `callback` with the node in the first argument.




