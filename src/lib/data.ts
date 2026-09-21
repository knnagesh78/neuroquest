import type { MemoryAnchor, Room } from "./types";

export const ROOMS: Room[] = [
  {
    id: "computer-science",
    name: "Computer Science",
    subtitle: "The logic laboratory",
    color: "#a78bfa",
    icon: "cpu",
  },
  {
    id: "human-anatomy",
    name: "Human Anatomy",
    subtitle: "The living atlas",
    color: "#5eead4",
    icon: "heart",
  },
  {
    id: "world-history",
    name: "World History",
    subtitle: "The archive of ages",
    color: "#fbbf24",
    icon: "landmark",
  },
];

const unreviewed = { reviewCount: 0, lastReviewedAt: null } as const;

export const INITIAL_ANCHORS: MemoryAnchor[] = [
  {
    ...unreviewed,
    id: "cs-data-structures",
    roomId: "computer-science",
    title: "Data Structures",
    category: "FOUNDATIONS",
    color: "#a78bfa",
    position: [-4, 0, -3],
    shape: "crystal",
    status: "mastered",
    content: `## Give information a shape

A **data structure** organizes values so that the operations your program needs are efficient. The right choice depends on how you read, insert, remove, and search your data.

### Three structures to remember

- **Array:** contiguous, indexed elements. Access by index is O(1); inserting near the front is O(n).
- **Stack:** last in, first out (LIFO). Picture a stack of books: the last book placed is the first removed.
- **Queue:** first in, first out (FIFO). Picture a line at a ticket counter.

\`\`\`javascript
const history = [];
history.push("Room entrance");
history.push("Purple crystal");
const previousStop = history.pop();
// "Purple crystal" — last in, first out
\`\`\`

> Memory cue: this crystal stores layers of information. Reach directly into an array, lift from a stack, or join a queue.

### Test your understanding

Which structure would you choose for an undo button, and why? **A stack**, because the most recent action should be undone first.`,
  },
  {
    ...unreviewed,
    id: "cs-neural-networks",
    roomId: "computer-science",
    title: "Neural Networks",
    category: "MACHINE LEARNING",
    color: "#60a5fa",
    position: [0, 0, -4.5],
    shape: "sphere",
    status: "learning",
    content: `## A network that learns

A **neural network** transforms an input through layers of weighted connections. Each neuron combines its inputs, adds a bias, and applies an activation function.

\`\`\`python
def neuron(inputs, weights, bias):
    z = sum(x * w for x, w in zip(inputs, weights)) + bias
    return max(0, z)  # ReLU activation
\`\`\`

### The training loop

1. **Forward pass:** produce a prediction.
2. **Loss:** measure the difference from the target.
3. **Backpropagation:** compute how each parameter affects the loss.
4. **Update:** adjust weights using an optimizer such as gradient descent.

Without nonlinear activation functions, stacked linear layers are still equivalent to a single linear transformation.

> Memory cue: blue sparks pass through this sphere, then travel backward to tune its connections.

### Test your understanding

What does a learning rate control? The size of each parameter update; too large can destabilize training, while too small can make progress slow.`,
  },
  {
    ...unreviewed,
    id: "cs-algorithms",
    roomId: "computer-science",
    title: "Algorithms",
    category: "PROBLEM SOLVING",
    color: "#fbbf24",
    position: [4, 0, -2.3],
    shape: "torus",
    status: "mastered",
    content: `## A precise path to an answer

An **algorithm** is a finite sequence of well-defined steps that solves a problem. Its quality depends on correctness, time complexity, and space complexity.

### Binary search

For a **sorted** array, compare the target with the middle value and discard the half that cannot contain it. Each iteration halves the remaining search space.

\`\`\`javascript
function binarySearch(values, target) {
  let lo = 0, hi = values.length - 1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (values[mid] === target) return mid;
    if (values[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
\`\`\`

Time: **O(log n)**. Extra space: **O(1)** for this iterative version.

> Memory cue: step through the golden ring and cut your search space in half every time.

### Test your understanding

Why does binary search fail on an unsorted array? The middle comparison no longer tells you which half can safely be discarded.`,
  },
  {
    ...unreviewed,
    id: "cs-binary-trees",
    roomId: "computer-science",
    title: "Binary Trees",
    category: "DATA STRUCTURES",
    color: "#2dd4bf",
    position: [-4, 0, 2.5],
    shape: "knot",
    status: "mastered",
    content: `## Every node, two possibilities

A **binary tree** is a hierarchical structure where each node has at most two children: left and right. A binary tree is not automatically a binary search tree.

In a **binary search tree (BST)** with distinct keys, every key in the left subtree is smaller than the node's key, and every key in the right subtree is larger.

### Traversals

- **In-order:** left → node → right. Produces sorted keys for a BST.
- **Pre-order:** node → left → right. Useful for copying tree structure.
- **Post-order:** left → right → node. Useful when children must be processed first.

\`\`\`javascript
function inorder(node, visit) {
  if (!node) return;
  inorder(node.left, visit);
  visit(node.value);
  inorder(node.right, visit);
}
\`\`\`

A balanced BST supports search in **O(log n)**. A tree that degenerates into a chain may require **O(n)**.

> Memory cue: follow the teal knot from its left branch, through the center, then along the right branch.

### Test your understanding

Does every binary tree return sorted values in order? No: that property requires the BST ordering invariant.`,
  },
  {
    ...unreviewed,
    id: "cs-system-design",
    roomId: "computer-science",
    title: "System Design",
    category: "ARCHITECTURE",
    color: "#f472b6",
    position: [0, 0, 1.5],
    shape: "cube",
    status: "new",
    content: `## Build systems that keep working

**System design** is the process of choosing components and their relationships to meet a product's requirements. Begin with the users, data, and constraints before choosing technologies.

### A common request path

\`\`\`text
Client → Load balancer → Application servers
                            ├─ Cache
                            ├─ Database
                            └─ Queue → Background workers
\`\`\`

- **Load balancer:** distributes incoming traffic across healthy servers.
- **Cache:** stores frequently accessed results, trading freshness for faster reads.
- **Queue:** decouples slow work from the request path and absorbs bursts.
- **Database:** stores durable application state; replication and sharding solve different scaling problems.

### Ask before designing

What must the system do? How much traffic is expected? Which matters most: latency, availability, consistency, or cost? Every architecture makes trade-offs.

> Memory cue: the pink cube is a building. Each face is a service; its edges are their communication paths.

### Test your understanding

Why put email delivery in a queue? A worker can retry it independently without making a user wait for the mail provider.`,
  },
  {
    ...unreviewed,
    id: "cs-big-o",
    roomId: "computer-science",
    title: "Big O Notation",
    category: "COMPLEXITY",
    color: "#c084fc",
    position: [4, 0, 3],
    shape: "pyramid",
    status: "learning",
    content: `## Think about growth

**Big O** describes an asymptotic upper bound on growth as input size increases. It ignores constant factors and lower-order terms; it does not directly measure elapsed seconds.

### Common growth rates

| Complexity | Typical example |
| --- | --- |
| O(1) | Read an array element by index |
| O(log n) | Binary search in a sorted array |
| O(n) | Scan every element once |
| O(n log n) | Merge sort |
| O(n²) | Compare all pairs |

\`\`\`javascript
// Two independent scans: O(n), not O(n²)
for (const item of items) inspect(item);
for (const item of items) save(item);

// Nested scans: O(n²)
for (const a of items)
  for (const b of items) compare(a, b);
\`\`\`

Always specify what case you are analyzing: worst, average, or best. Space complexity counts additional storage as a function of input size.

> Memory cue: climb this violet pyramid. Each level grows wider, just as work grows with the input.

### Test your understanding

What is O(3n + 12)? **O(n)**, because constant factors and fixed offsets do not change the asymptotic growth rate.`,
  },
  {
    ...unreviewed,
    id: "anatomy-heart",
    roomId: "human-anatomy",
    title: "The Human Heart",
    category: "CARDIOVASCULAR",
    color: "#fb7185",
    position: [-4, 0, -2],
    shape: "crystal",
    status: "learning",
    content: `## A double pump

The heart has **four chambers**: two atria receive blood, and two ventricles pump it onward. The right side sends blood to the lungs; the left side sends oxygenated blood to the body.

### Trace one circuit

Body → venae cavae → right atrium → tricuspid valve → right ventricle → pulmonary valve → pulmonary arteries → lungs → pulmonary veins → left atrium → mitral valve → left ventricle → aortic valve → aorta → body.

Valves support one-way flow. Arteries carry blood **away** from the heart, and veins carry blood **toward** it; these names do not specify oxygen content.

> Memory cue: the red crystal is a four-room house with one-way doors.

### Test your understanding

Why is the left ventricular wall thicker? It generates the higher pressure needed to drive blood through systemic circulation.`,
  },
  {
    ...unreviewed,
    id: "anatomy-neuron",
    roomId: "human-anatomy",
    title: "The Neuron",
    category: "NERVOUS SYSTEM",
    color: "#5eead4",
    position: [0, 0, 2],
    shape: "knot",
    status: "new",
    content: `## The body's signaling cell

A **neuron** receives, integrates, and transmits information. Dendrites receive many incoming signals; the cell body maintains the cell; the axon carries action potentials toward terminals.

### From electricity to chemistry

1. Incoming signals change membrane voltage.
2. If threshold is reached, an action potential propagates along the axon.
3. At a chemical synapse, neurotransmitter is released.
4. The transmitter binds receptors on the next cell.

**Myelin** insulates sections of the axon. Action potentials are regenerated at the nodes of Ranvier, enabling faster saltatory conduction.

> Memory cue: the teal branches receive whispers, then send a single bright message down the trunk.

### Test your understanding

Does a stronger stimulus produce a larger action potential? Individual action potentials are all-or-none; stimulus intensity can instead affect firing frequency and neuron recruitment.`,
  },
  {
    ...unreviewed,
    id: "anatomy-lungs",
    roomId: "human-anatomy",
    title: "Gas Exchange",
    category: "RESPIRATORY",
    color: "#7dd3fc",
    position: [4, 0, -2],
    shape: "sphere",
    status: "mastered",
    content: `## Small sacs, enormous surface

The lungs exchange gases in microscopic air sacs called **alveoli**. Their thin walls, large collective surface area, and close contact with capillaries support diffusion.

Oxygen moves from alveolar air into blood down its partial-pressure gradient. Carbon dioxide moves from blood into the alveoli and is exhaled.

### Ventilation and exchange

- **Ventilation** moves air into and out of the lungs.
- **Gas exchange** moves gases across the respiratory membrane.
- **Perfusion** supplies blood to the capillaries.

When the diaphragm contracts, the thoracic cavity expands, pressure drops, and air flows inward. Quiet exhalation is mainly passive.

> Memory cue: the blue sphere is an alveolus—oxygen enters its surrounding river while carbon dioxide leaves.

### Test your understanding

Why are thin alveolar walls useful? They shorten the diffusion distance between air and blood.`,
  },
  {
    ...unreviewed,
    id: "history-renaissance",
    roomId: "world-history",
    title: "The Renaissance",
    category: "CULTURE & IDEAS",
    color: "#fbbf24",
    position: [-4, 0, -2],
    shape: "pyramid",
    status: "mastered",
    content: `## A renewal of learning

The **Renaissance** was a period of cultural and intellectual change that began in Italian cities during the late medieval era and spread across Europe. Its timing and character varied by region.

### Connections to remember

- **Humanism:** renewed study of classical texts, languages, rhetoric, history, and moral philosophy.
- **Patronage:** wealthy families, civic governments, and religious institutions funded artists and scholars.
- **Printing:** movable-type printing helped texts circulate more widely in Europe from the mid-fifteenth century.
- **Art:** perspective and close observation transformed how space and the body were represented.

The Renaissance did not erase medieval traditions; new ideas developed alongside religious life and older institutions.

> Memory cue: the golden pyramid holds a classical manuscript, a painter's brush, and a printing block.

### Test your understanding

How could patronage influence art? Patrons supplied resources and often shaped a work's subject, audience, and purpose.`,
  },
  {
    ...unreviewed,
    id: "history-industrial",
    roomId: "world-history",
    title: "Industrial Revolution",
    category: "ECONOMY & SOCIETY",
    color: "#fb923c",
    position: [0, 0, 2],
    shape: "torus",
    status: "learning",
    content: `## When production changed scale

The **Industrial Revolution** began in Britain in the eighteenth century and transformed production through mechanization, new energy sources, and factory organization. Industrialization later spread unevenly across other regions.

### A chain of change

Coal and steam power → mechanized production → factories → urban growth → new labor relations and social movements.

Textile manufacturing, iron production, and transport were central sectors. Railways connected markets and reduced travel times. Productivity rose, but many workers faced long hours, dangerous conditions, and insecure incomes.

### Think in causes and consequences

No single invention explains industrialization. Resources, capital, institutions, global trade, and labor all played roles.

> Memory cue: the orange ring is a factory wheel that turns faster as cities rise around it.

### Test your understanding

How did the factory system change work? It concentrated workers and machines in one place and organized labor around coordinated schedules and supervision.`,
  },
  {
    ...unreviewed,
    id: "history-silk-road",
    roomId: "world-history",
    title: "The Silk Roads",
    category: "TRADE & EXCHANGE",
    color: "#c084fc",
    position: [4, 0, -2],
    shape: "cube",
    status: "new",
    content: `## Many routes, connected worlds

The **Silk Roads** were networks of overland trade and exchange linking regions of Asia with the Middle East and Europe. They were many interconnected routes, not one continuous road.

### More than silk

Merchants carried textiles, spices, metals, and other goods. Religious ideas, artistic styles, technologies, and diseases also moved through these networks.

Most merchants traveled only part of the network, exchanging goods at intermediary cities. Oasis settlements and trading hubs connected different languages and cultures.

Political stability, geography, and demand affected which routes flourished. Maritime trading networks also linked distant societies.

> Memory cue: open the violet traveling chest to find goods, ideas, and stories from many places.

### Test your understanding

Why is “Silk Roads” plural? Exchange depended on multiple changing routes and local connections across a vast region.`,
  },
];
