# Joint

The `Joint` node connects two physics bodies together with various constraints.

### `.type`: String

The type of joint. Can be one of:
- `'fixed'`: Bodies are locked together.
- `'socket'`: Bodies can rotate freely around a pivot point (ball and socket).
- `'hinge'`: Bodies can rotate around a single axis.
- `'distance'`: Bodies are kept within a certain distance range.

### `.body0`: Node

The first body (RigidBody) connected by the joint.

### `.body1`: Node

The second body (RigidBody) connected by the joint.

### `.offset0`: Vector3

The position offset of the joint attachment point relative to `body0`.

### `.offset1`: Vector3

The position offset of the joint attachment point relative to `body1`.

### `.quaternion0`: Quaternion

The rotation offset of the joint attachment point relative to `body0`.

### `.quaternion1`: Quaternion

The rotation offset of the joint attachment point relative to `body1`.

### `.breakForce`: Number

The force required to break the joint. Default is `Infinity`.

### `.breakTorque`: Number

The torque required to break the joint. Default is `Infinity`.

### `.collide`: Boolean

Whether the two connected bodies should collide with each other. Default is `false`.

### `.axis`: Vector3

The axis of rotation for `'hinge'` and `'socket'` joints.

### `.limitMin`: Number

The lower limit for `'hinge'` (angle in degrees) and `'distance'` (distance in meters) joints.

### `.limitMax`: Number

The upper limit for `'hinge'` (angle in degrees) and `'distance'` (distance in meters) joints.

### `.limitY`: Number

The limit angle in degrees for the Y axis of a `'socket'` joint.

### `.limitZ`: Number

The limit angle in degrees for the Z axis of a `'socket'` joint.

### `.limitStiffness`: Number

The stiffness of the limit spring.

### `.limitDamping`: Number

The damping of the limit spring.
